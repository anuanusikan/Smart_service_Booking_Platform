export function routeRedirect(user, requiredRole) {
  if (!user || !['customer', 'provider'].includes(user.role)) return '/login';
  if (requiredRole && user.role !== requiredRole) {
    return user.role === 'provider' ? '/provider-dashboard' : '/dashboard';
  }
  return null;
}
