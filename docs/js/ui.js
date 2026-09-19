let hideTimer = null;

function showToast(message, ms = 3000) {
  const toast = document.getElementById('reminder-toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => toast.classList.add('hidden'), ms);
}

export const UI = { showToast };
