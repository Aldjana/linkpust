import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestRoute, ProtectedRoute } from './components/RouteGuards.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Links from './pages/Links.jsx';
import Analytics from './pages/Analytics.jsx';
import Billing from './pages/Billing.jsx';
import Profile from './pages/Profile.jsx';
import PublicPage from './pages/PublicPage.jsx';
import NotFound from './pages/NotFound.jsx';

// /@username : React Router ne gère pas un segment partiellement dynamique ("@:username"),
// on capte donc /:handle et on vérifie le préfixe @.
function HandleRoute() {
  return <PublicPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="links" replace />} />
        <Route path="links" element={<Links />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="billing" element={<Billing />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/:handle" element={<HandleRoute />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
