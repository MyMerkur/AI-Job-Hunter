import mongoose from 'mongoose';

export async function connectToDatabase(mongoUri: string): Promise<void> {
  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
  });

  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected (${mongoose.connection.name})`);
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
