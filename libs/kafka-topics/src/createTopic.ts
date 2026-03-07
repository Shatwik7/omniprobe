import { Topics } from '@app/kafka-topics';
import { Kafka } from 'kafkajs';

export async function ensureTopics() {
  const kafka = new Kafka({
    brokers: [process.env.KAFKA_URL ||'localhost:9092'],
  });

  const admin = kafka.admin();
  await admin.connect();

  await admin.createTopics({
    waitForLeaders: true,
    topics: Object.values(Topics).map((topic) => ({
      topic,
      numPartitions: 3,
      replicationFactor: 1,
    })),
  });

  await admin.disconnect();
}