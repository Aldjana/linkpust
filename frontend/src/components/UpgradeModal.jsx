import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { FEATURES, PRO_PRICE } from '../lib/plans.js';
import { formatPrice } from '../lib/format.js';
import { Alert, Button, Input, Modal } from './ui.jsx';
import { Icon } from './icons.jsx';

const defaultExpiry = () => `12/${String((new Date().getFullYear() + 2) % 100).padStart(2, '0')}`;
const formatCard = (value) => value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const TEST_CARDS = [
  { label: 'Paiement accepté', number: '4242 4242 4242 4242' },
  { label: 'Carte refusée', number: '4000 0000 0000 0002' },
];

// Paiement simulé : la validation se fait côté backend (voir backend/src/services/payment.js)
export default function UpgradeModal({ open, onClose, reason }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ number: TEST_CARDS[0].number, expiry: defaultExpiry(), cvc: '123' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setFieldErrors({});
    }
  }, [open]);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    try {
      const data = await api.post('/billing/checkout', { plan: 'pro', card: form });
      setUser(data.user);
      toast.success('Bienvenue dans LinkPulse Pro !');
      onClose();
    } catch (err) {
      if (err.details) setFieldErrors(err.details);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Passer à LinkPulse Pro">
      {reason && (
        <div className="mb-4">
          <Alert type="warning">{reason}</Alert>
        </div>
      )}

      <p className="text-3xl font-extrabold">
        {formatPrice(PRO_PRICE)} <span className="text-sm font-medium text-slate-500">/ mois</span>
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
        {FEATURES.pro.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <Icon name="check" className="h-4 w-4 text-brand-600" /> {feature}
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-6 space-y-3" noValidate>
        <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          <strong>Mode test</strong> : aucun débit réel. Cartes de test :{' '}
          {TEST_CARDS.map((card, i) => (
            <span key={card.number}>
              {i > 0 && ' · '}
              <button
                type="button"
                className="font-semibold text-brand-700 underline"
                onClick={() => setForm((f) => ({ ...f, number: card.number }))}
              >
                {card.label}
              </button>
            </span>
          ))}
        </div>

        <Input
          label="Numéro de carte"
          inputMode="numeric"
          autoComplete="cc-number"
          value={form.number}
          onChange={(e) => setForm({ ...form, number: formatCard(e.target.value) })}
          error={fieldErrors['card.number']}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Expiration"
            placeholder="MM/AA"
            inputMode="numeric"
            autoComplete="cc-exp"
            value={form.expiry}
            onChange={(e) => setForm({ ...form, expiry: formatExpiry(e.target.value) })}
            error={fieldErrors['card.expiry']}
          />
          <Input
            label="CVC"
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={4}
            value={form.cvc}
            onChange={(e) => setForm({ ...form, cvc: e.target.value.replace(/\D/g, '') })}
            error={fieldErrors['card.cvc']}
          />
        </div>

        {error && !Object.keys(fieldErrors).length && <Alert type="error">{error}</Alert>}

        <Button type="submit" loading={loading} className="w-full">
          Payer {formatPrice(PRO_PRICE)} et passer Pro
        </Button>
      </form>
    </Modal>
  );
}
