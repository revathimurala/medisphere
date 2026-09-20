import { Kafka, logLevel } from "kafkajs";

process.env.KAFKAJS_NO_PARTITIONER_WARNING = "1";

export const topic = process.env.KAFKA_TOPIC || "patient-health-data";

export const kafka = new Kafka({
  clientId: "medisphere",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  retry: { initialRetryTime: 300, retries: 2 },
  connectionTimeout: 2000,
  logLevel: logLevel.NOTHING
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: "medisphere-twin-consumer" });

export let kafkaReady = false;

export function isKafkaReady() {
  return kafkaReady;
}

export async function startKafka(onMessageCallback) {
  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });
    kafkaReady = true;
    console.log("Kafka producer and consumer connected successfully.");

    if (onMessageCallback) {
      await consumer.run({
        eachMessage: async (payload) => {
          await onMessageCallback(payload);
        }
      });
    }
  } catch (error) {
    kafkaReady = false;
    throw error;
  }
}
