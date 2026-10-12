import mongoose from 'mongoose';

const { Schema } = mongoose;

// Historique des paiements (simulés). On ne stocke JAMAIS le numéro de carte complet : uniquement les 4 derniers chiffres.
const paymentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['upgrade', 'renewal'], required: true },
    plan: { type: String, enum: ['pro'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: ['succeeded', 'failed'], required: true },
    provider: { type: String, default: 'mock' },
    reference: { type: String, default: null },
    cardLast4: { type: String, default: null },
    failureCode: { type: String, default: null },
    failureMessage: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('Payment', paymentSchema);
