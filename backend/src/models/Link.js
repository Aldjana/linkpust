import mongoose from 'mongoose';

const { Schema } = mongoose;

const linkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

linkSchema.index({ user: 1, order: 1 });

export default mongoose.model('Link', linkSchema);
