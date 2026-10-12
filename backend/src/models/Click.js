import mongoose from 'mongoose';
import { CLICK_RETENTION_DAYS } from '../utils/plans.js';

const { Schema } = mongoose;

const clickSchema = new Schema(
  {
    link: { type: Schema.Types.ObjectId, ref: 'Link', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // TTL : les clics plus vieux que la rétention maximale (Pro = 90 j) sont purgés par MongoDB
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expireAfterSeconds: CLICK_RETENTION_DAYS * 86_400 },
    },
    device: { type: String, enum: ['mobile', 'tablet', 'desktop', 'other'], default: 'other' },
    source: { type: String, default: 'direct', maxlength: 60 },
    country: { type: String, default: null, maxlength: 2 },
  },
  { versionKey: false }
);

clickSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Click', clickSchema);
