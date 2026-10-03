import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jyoti_mandal_vargani';

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log(`[MongoDB Connected]: ${m.connection.host}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error(`[MongoDB Connection Error]: ${e.message}`);
    if (!process.env.VERCEL) {
      // Don't kill process in serverless, only in standalone local
      console.error('Check your MONGO_URI in .env');
    }
    throw e;
  }

  return cached.conn;
};
