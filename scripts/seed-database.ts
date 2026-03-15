import 'reflect-metadata';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as argon2 from 'argon2';
import { DataSource, EntityManager } from 'typeorm';
import {
  Alert,
  AlertPolicy,
  Analytics,
  Metric,
  Monitor,
  Notification,
  Project,
  Team,
  User,
} from '@app/database';
import { AlertType } from '@app/database/entity/alert.entity';
import {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from '@app/database/entity/incident.entity';

type SeedConfig = {
  keepExisting: boolean;
  teamCount: number;
  usersPerTeam: number;
  projectsPerTeam: number;
  monitorsPerProject: number;
  metricsPerMonitor: number;
  seedPassword: string;
  emailTag: string;
};

type MonitorSeedResult = {
  metricsCount: number;
  alertsCount: number;
  incidentsCount: number;
  notificationsCount: number;
  analyticsCount: number;
};

const ROOT_DIR = process.cwd();
const REGIONS = ['NA', 'EU', 'IN', 'AU'] as const;
const USER_ROLES = ['owner', 'developer', 'sre', 'analyst', 'qa', 'ops'];
const PROJECT_SUFFIXES = ['Core API', 'Checkout', 'Web App', 'Auth', 'Billing'];
const ALERT_CHANNELS = ['slack', 'email', 'webhook'] as const;
const ARGON2_OPTIONS: argon2.Options = {
  memoryCost: 2000,
  timeCost: 10,
  parallelism: 2,
  hashLength: 252,
};

function loadEnvFile(fileName: string) {
  const filePath = join(ROOT_DIR, fileName);
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else if (value.includes(' #')) {
      value = value.split(' #')[0].trim();
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseNumberArg(name: string, fallback: number): number {
  const flag = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!flag) {
    return fallback;
  }

  const value = Number(flag.split('=')[1]);
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`Invalid value for --${name}: ${flag.split('=')[1]}`);
  }

  return Math.floor(value);
}

function parseStringArg(name: string, fallback: string): string {
  const flag = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return flag ? flag.split('=').slice(1).join('=').trim() : fallback;
}

function getConfig(): SeedConfig {
  const emailTag = process.argv.includes('--keep-existing')
    ? `+${Date.now()}`
    : '';

  return {
    keepExisting: process.argv.includes('--keep-existing'),
    teamCount: parseNumberArg('teams', 3),
    usersPerTeam: parseNumberArg('users-per-team', 4),
    projectsPerTeam: parseNumberArg('projects-per-team', 2),
    monitorsPerProject: parseNumberArg('monitors-per-project', 3),
    metricsPerMonitor: parseNumberArg('metrics-per-monitor', 200),
    seedPassword: parseStringArg('password', 'SeededUser@123'),
    emailTag,
  };
}

function showHelp() {
  console.log(`
Usage: npm run seed:db -- [options]

Options:
  --keep-existing             Do not truncate existing rows before seeding.
  --teams=<number>            Number of teams to create. Default: 3
  --users-per-team=<number>   Users per team. Default: 4
  --projects-per-team=<n>     Projects per team. Default: 2
  --monitors-per-project=<n>  Monitors per project. Default: 3
  --metrics-per-monitor=<n>   Metrics per monitor. Default: 200
  --password=<value>          Plaintext password used before hashing. Default: SeededUser@123
`);
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function createDataSource() {
  return new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: envNumber('POSTGRES_PORT', 5433),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'mydatabase',
    entities: [
      User,
      Team,
      Project,
      AlertPolicy,
      Alert,
      Incident,
      Metric,
      Monitor,
      Notification,
      Analytics,
    ],
    synchronize: true,
  });
}

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)] as T;
}

function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const position = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[position];
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function buildForecast(values: number[]) {
  const base = average(values.slice(-10)) || average(values) || 0;
  const predictions = Array.from({ length: 6 }, (_, index) =>
    Number((base + index * 6.5).toFixed(2)),
  );

  return {
    totalPrediction: predictions,
    confidenceUpper: predictions.map((value) => Number((value * 1.12).toFixed(2))),
    confidenceLower: predictions.map((value) => Number((value * 0.9).toFixed(2))),
  };
}

function buildBreakdown(totalTimeMs: number, rng: () => number) {
  const dns = Math.max(3, Math.round(totalTimeMs * (0.03 + rng() * 0.04)));
  const tcp = Math.max(6, Math.round(totalTimeMs * (0.05 + rng() * 0.05)));
  const tls = Math.max(8, Math.round(totalTimeMs * (0.06 + rng() * 0.06)));
  const ttfb = Math.max(15, Math.round(totalTimeMs * (0.1 + rng() * 0.1)));
  const ctt = Math.max(8, Math.round(totalTimeMs * (0.05 + rng() * 0.07)));
  const remaining = totalTimeMs - (dns + tcp + tls + ttfb + ctt);
  const spt = Math.max(5, remaining);

  return {
    dns,
    tcp,
    tls,
    ttfb,
    spt,
    ctt,
  };
}

function metricTimestamp(index: number, metricsPerMonitor: number) {
  const minutesAgo = (metricsPerMonitor - index) * 15;
  return new Date(Date.now() - minutesAgo * 60_000);
}

async function clearDatabase(manager: EntityManager) {
  await manager.query(`
    TRUNCATE TABLE
      "analytics",
      "notifications",
      "alerts",
      "incidents",
      "metrics",
      "monitors",
      "alert_policies",
      "projects",
      "teams",
      "users"
    RESTART IDENTITY CASCADE
  `);
}

async function createUsers(manager: EntityManager, config: SeedConfig) {
  const userRepository = manager.getRepository(User);
  const users: User[] = [];

  for (let teamIndex = 0; teamIndex < config.teamCount; teamIndex += 1) {
    for (let userIndex = 0; userIndex < config.usersPerTeam; userIndex += 1) {
      const role = USER_ROLES[userIndex % USER_ROLES.length];
      const password = await argon2.hash(config.seedPassword, ARGON2_OPTIONS);
      users.push(
        userRepository.create({
          name: `Team ${teamIndex + 1} ${role.toUpperCase()}`,
          email: `team${teamIndex + 1}.${role}${userIndex + 1}${config.emailTag}@seed.omniprobe.dev`,
          password,
        }),
      );
    }
  }

  for (const user of users) {
    console.log(`Created user: ${user.email}`);
  }
  return userRepository.save(users);
}

async function createTeams(manager: EntityManager, config: SeedConfig, users: User[]) {
  const teamRepository = manager.getRepository(Team);
  const teams: Team[] = [];

  for (let teamIndex = 0; teamIndex < config.teamCount; teamIndex += 1) {
    const creator = users[teamIndex * config.usersPerTeam];
    teams.push(
      teamRepository.create({
        name: `Operations Team ${teamIndex + 1}`,
        createdBy: creator,
      }),
    );
  }

  return teamRepository.save(teams);
}

async function attachTeamMemberships(
  manager: EntityManager,
  config: SeedConfig,
  users: User[],
  teams: Team[],
) {
  for (let teamIndex = 0; teamIndex < teams.length; teamIndex += 1) {
    const members = users.slice(
      teamIndex * config.usersPerTeam,
      teamIndex * config.usersPerTeam + config.usersPerTeam,
    );

    for (const member of members) {
      await manager
        .createQueryBuilder()
        .relation(User, 'teams')
        .of(member.id)
        .add(teams[teamIndex].id);
    }
  }
}

async function createProjects(manager: EntityManager, config: SeedConfig, teams: Team[]) {
  const projectRepository = manager.getRepository(Project);
  const projects: Project[] = [];

  for (let teamIndex = 0; teamIndex < teams.length; teamIndex += 1) {
    for (let projectIndex = 0; projectIndex < config.projectsPerTeam; projectIndex += 1) {
      const suffix = PROJECT_SUFFIXES[projectIndex % PROJECT_SUFFIXES.length];
      projects.push(
        projectRepository.create({
          name: `Team ${teamIndex + 1} ${suffix}`,
          description: `Seeded project ${projectIndex + 1} for team ${teamIndex + 1}`,
          team: teams[teamIndex],
        }),
      );
    }
  }

  return projectRepository.save(projects);
}

async function createAlertPolicies(manager: EntityManager, projects: Project[]) {
  const policyRepository = manager.getRepository(AlertPolicy);

  return policyRepository.save(
    projects.map((project, index) =>
      policyRepository.create({
        name: `${project.name} Policy`,
        projectId: project.id,
        rules: {
          version: '1.0',
          logic: 'OR',
          actions: ['create_alert', 'notify_team'],
          rules: [
            { metric: 'latency', operator: '>', threshold: 600, window: '5m' },
            { metric: 'error_rate', operator: '>', threshold: 0.05, window: '15m' },
            { metric: 'availability', operator: '<', threshold: 99.5, window: '1h' },
          ],
          suppression: {
            cooldown: '5m',
            maintenance: [
              {
                start: '2026-03-16T02:00:00.000Z',
                end: '2026-03-16T03:00:00.000Z',
              },
            ],
          },
        },
        notificationChannels: [
          {
            channelType: 'slack',
            address: `#team-${index + 1}-alerts`,
          },
          {
            channelType: 'email',
            address: `alerts+project${index + 1}@seed.omniprobe.dev`,
          },
        ],
      }),
    ),
  );
}

async function seedMonitorData(
  manager: EntityManager,
  monitor: Monitor,
  project: Project,
  users: User[],
  config: SeedConfig,
  seedOffset: number,
): Promise<MonitorSeedResult> {
  const metricRepository = manager.getRepository(Metric);
  const alertRepository = manager.getRepository(Alert);
  const incidentRepository = manager.getRepository(Incident);
  const notificationRepository = manager.getRepository(Notification);
  const analyticsRepository = manager.getRepository(Analytics);
  const rng = createRng(seedOffset + 1000);
  const metricEntities: Metric[] = [];

  for (let metricIndex = 0; metricIndex < config.metricsPerMonitor; metricIndex += 1) {
    const degraded = metricIndex % 37 === 0;
    const failed = metricIndex % 29 === 0;
    const region = REGIONS[(metricIndex + seedOffset) % REGIONS.length];
    const baseDuration = randomInt(rng, 140, 420) + (degraded ? 250 : 0);
    const durationMs = failed ? baseDuration + 180 : baseDuration;
    const breakdown = buildBreakdown(durationMs, rng);
    const statusCode = failed ? pick(rng, [500, 502, 503]) : 200;

    metricEntities.push(
      metricRepository.create({
        durationMs,
        statusCode,
        breakdown,
        dns_response_time_ms: breakdown.dns,
        tcp_connection_time_ms: breakdown.tcp,
        tls_handshake_time_ms: breakdown.tls,
        time_to_first_byte_ms: breakdown.ttfb,
        server_processing_time_ms: breakdown.spt,
        content_transfer_time_ms: breakdown.ctt,
        total_time_ms: durationMs,
        region,
        isSuccess: !failed,
        monitor,
        responseBody: failed ? '{"error":"upstream timeout"}' : '{"ok":true}',
        createdAt: metricTimestamp(metricIndex, config.metricsPerMonitor),
      }),
    );
  }

  const metrics = await metricRepository.save(metricEntities, { chunk: 250 });
  const failedMetrics = metrics.filter((metric) => !metric.isSuccess);
  const slowMetrics = metrics.filter((metric) => metric.total_time_ms > 600);
  const latestFailedMetric = failedMetrics.at(-1);
  const latestSlowMetric = slowMetrics.at(-1) ?? metrics.at(-1);

  const alertsToCreate: Alert[] = [];
  if (latestSlowMetric) {
    alertsToCreate.push(
      alertRepository.create({
        type: AlertType.SLA_BREACH,
        message: `Latency threshold breached for ${monitor.name}`,
        metadata: {
          thresholdMs: 600,
          observedMs: latestSlowMetric.total_time_ms,
          projectId: project.id,
        },
        monitor,
        metric: latestSlowMetric,
      }),
    );
  }

  if (latestFailedMetric) {
    alertsToCreate.push(
      alertRepository.create({
        type: AlertType.ERROR_RATE,
        message: `Recent failures detected for ${monitor.name}`,
        metadata: {
          failures: failedMetrics.length,
          sampleStatusCode: latestFailedMetric.statusCode,
        },
        monitor,
        metric: latestFailedMetric,
      }),
    );
  }

  alertsToCreate.push(
    alertRepository.create({
      type: AlertType.DEGRADATION,
      message: `Network degradation trend observed for ${monitor.name}`,
      metadata: {
        dominantComponent: 'ttfb',
        p95: percentile(metrics.map((metric) => metric.total_time_ms), 95),
      },
      monitor,
      metric: latestSlowMetric,
    }),
  );

  const alerts = await alertRepository.save(alertsToCreate);

  const incidentsToCreate: Incident[] = [];
  if (latestFailedMetric) {
    incidentsToCreate.push(
      incidentRepository.create({
        status: failedMetrics.length > 3 ? IncidentStatus.ACKNOWLEDGED : IncidentStatus.OPEN,
        severity: failedMetrics.length > 5 ? IncidentSeverity.CRITICAL : IncidentSeverity.WARNING,
        summary: `Incident for ${monitor.name}: repeated request failures`,
        acknowledgedAt:
          failedMetrics.length > 3 ? new Date(Date.now() - 20 * 60_000) : undefined,
        acknowledgedBy: failedMetrics.length > 3 ? users[0] : undefined,
        monitor,
        metric: latestFailedMetric,
      }),
    );
  }

  if ((seedOffset + 1) % 4 === 0 && latestSlowMetric) {
    incidentsToCreate.push(
      incidentRepository.create({
        status: IncidentStatus.RESOLVED,
        severity: IncidentSeverity.WARNING,
        summary: `Recovered latency regression for ${monitor.name}`,
        resolvedAt: new Date(Date.now() - 90 * 60_000),
        monitor,
        metric: latestSlowMetric,
      }),
    );
  }

  const incidents = await incidentRepository.save(incidentsToCreate);

  const notificationsToCreate: Notification[] = [];
  for (const alert of alerts) {
    notificationsToCreate.push(
      notificationRepository.create({
        channel: pick(rng, ALERT_CHANNELS).toUpperCase(),
        address: `alerts-${project.id.slice(0, 8)}@seed.omniprobe.dev`,
        status: 'SENT',
        alert_id: alert.id,
        title: `${alert.type} notification`,
        message: alert.message,
        project,
      }),
    );
  }

  for (const incident of incidents) {
    notificationsToCreate.push(
      notificationRepository.create({
        channel: 'SLACK',
        address: `#incident-${project.id.slice(0, 8)}`,
        status: incident.status === IncidentStatus.OPEN ? 'PENDING' : 'SENT',
        incident_id: incident.id,
        title: `Incident ${incident.status}`,
        message: incident.summary,
        project,
      }),
    );
  }

  const notifications = await notificationRepository.save(notificationsToCreate);
  const durationSeries = metrics.map((metric) => metric.total_time_ms);
  const analyticsToCreate = REGIONS.map((region) => {
    const regionalMetrics = metrics.filter((metric) => metric.region === region);
    const regionalDurations = regionalMetrics.map((metric) => metric.total_time_ms);
    const recentMetrics = regionalMetrics.slice(-10).map((metric) => ({
      id: metric.id,
      total_time_ms: metric.total_time_ms,
      statusCode: metric.statusCode,
      isSuccess: metric.isSuccess,
      createdAt: metric.createdAt,
      region: metric.region,
    }));
    const mean = average(regionalDurations);
    const stdev = stdDev(regionalDurations);

    return analyticsRepository.create({
      monitor,
      region,
      rollingAverage: Number(mean.toFixed(4)),
      rollingStdDev: Number(stdev.toFixed(4)),
      variance: Number((stdev ** 2).toFixed(4)),
      p95: Number(percentile(regionalDurations, 95).toFixed(4)),
      p99: Number(percentile(regionalDurations, 99).toFixed(4)),
      anomalyDetected: regionalDurations.some((value) => value > mean + stdev * 1.8),
      degradingComponent: 'ttfb',
      networkRatio: Number((average(regionalMetrics.map((metric) => metric.dns_response_time_ms + metric.tcp_connection_time_ms + metric.tls_handshake_time_ms)) / Math.max(mean, 1)).toFixed(4)),
      backendRatio: Number((average(regionalMetrics.map((metric) => metric.server_processing_time_ms + metric.time_to_first_byte_ms)) / Math.max(mean, 1)).toFixed(4)),
      forecast: buildForecast(durationSeries),
      predictedSlaBreach: regionalDurations.slice(-5).some((value) => value > 600),
      errorRate: Number((regionalMetrics.filter((metric) => !metric.isSuccess).length / Math.max(regionalMetrics.length, 1)).toFixed(4)),
      trend: mean > average(durationSeries) ? 'UP' : 'STABLE',
      recentMetrics,
    });
  });

  const analytics = await analyticsRepository.save(analyticsToCreate);

  return {
    metricsCount: metrics.length,
    alertsCount: alerts.length,
    incidentsCount: incidents.length,
    notificationsCount: notifications.length,
    analyticsCount: analytics.length,
  };
}

async function createMonitorsAndDependents(
  manager: EntityManager,
  config: SeedConfig,
  projects: Project[],
  policies: AlertPolicy[],
  users: User[],
) {
  const monitorRepository = manager.getRepository(Monitor);
  const monitorsToCreate: Monitor[] = [];

  for (let projectIndex = 0; projectIndex < projects.length; projectIndex += 1) {
    for (
      let monitorIndex = 0;
      monitorIndex < config.monitorsPerProject;
      monitorIndex += 1
    ) {
      const project = projects[projectIndex];
      const policy = policies[projectIndex];
      const method = monitorIndex % 3 === 0 ? 'GET' : monitorIndex % 3 === 1 ? 'POST' : 'PUT';

      monitorsToCreate.push(
        monitorRepository.create({
          name: `${project.name} Monitor ${monitorIndex + 1}`,
          target: `https://service-${projectIndex + 1}-${monitorIndex + 1}.seed.omniprobe.dev/${method === 'GET' ? 'health' : 'checks'}`,
          method,
          frequencySeconds: 60 * (monitorIndex + 1),
          isLive: true,
          isActive: true,
          headers: {
            'x-seeded-project': project.name,
            'x-monitor-index': monitorIndex + 1,
          },
          body: method === 'GET' ? '' : JSON.stringify({ ping: true, source: 'seed-script' }),
          maintencePeriods: [
            {
              start: '2026-03-17T01:00:00.000Z',
              end: '2026-03-17T02:00:00.000Z',
            },
          ],
          project,
          alertPolicy: policy,
          expectedStatus: 200,
          expectedBody: { ok: true },
        }),
      );
    }
  }

  const monitors = await monitorRepository.save(monitorsToCreate);
  const summary = {
    metricsCount: 0,
    alertsCount: 0,
    incidentsCount: 0,
    notificationsCount: 0,
    analyticsCount: 0,
  };

  for (let index = 0; index < monitors.length; index += 1) {
    const monitor = monitors[index];
    const result = await seedMonitorData(
      manager,
      monitor,
      monitor.project,
      users,
      config,
      index,
    );

    summary.metricsCount += result.metricsCount;
    summary.alertsCount += result.alertsCount;
    summary.incidentsCount += result.incidentsCount;
    summary.notificationsCount += result.notificationsCount;
    summary.analyticsCount += result.analyticsCount;
  }

  return {
    monitors,
    ...summary,
  };
}

async function seed() {
  if (process.argv.includes('--help')) {
    showHelp();
    return;
  }

  loadEnvFile('.env');
  loadEnvFile('.env.example');

  const config = getConfig();
  const dataSource = createDataSource();

  await dataSource.initialize();
  console.log('Connected to PostgreSQL for seeding.');

  try {
    const summary = await dataSource.transaction(async (manager) => {
      if (!config.keepExisting) {
        await clearDatabase(manager);
      }

      const users = await createUsers(manager, config);
      const teams = await createTeams(manager, config, users);
      await attachTeamMemberships(manager, config, users, teams);
      const projects = await createProjects(manager, config, teams);
      const policies = await createAlertPolicies(manager, projects);
      const monitorSummary = await createMonitorsAndDependents(
        manager,
        config,
        projects,
        policies,
        users,
      );

      return {
        users: users.length,
        teams: teams.length,
        projects: projects.length,
        alertPolicies: policies.length,
        monitors: monitorSummary.monitors.length,
        metrics: monitorSummary.metricsCount,
        alerts: monitorSummary.alertsCount,
        incidents: monitorSummary.incidentsCount,
        notifications: monitorSummary.notificationsCount,
        analytics: monitorSummary.analyticsCount,
      };
    });

    console.log('Database seeding completed successfully.');
    console.table(summary);
    console.log(`Seeded user password (stored hashed in DB): ${config.seedPassword}`);
  } finally {
    await dataSource.destroy();
  }
}

void seed().catch((error: unknown) => {
  console.error('Database seeding failed.', error);
  process.exitCode = 1;
});