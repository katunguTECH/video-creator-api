import { Navigate, useLocation } from 'react-router-dom';

export default function PaymentCallback() {
  const { search } = useLocation();
  return <Navigate to={`/create${search}`} replace />;
}