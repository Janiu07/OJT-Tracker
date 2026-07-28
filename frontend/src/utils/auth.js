export function getAuthErrorMessage(err, fallbackMessage) {
  if (err.response?.data?.message) {
    return err.response.data.message;
  }

  if (err.request) {
    return 'Cannot connect to the server. Make sure the backend is running on port 5000.';
  }

  return fallbackMessage;
}
