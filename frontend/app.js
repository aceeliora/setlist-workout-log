const API_BASE = String(window.SETLIST_API_BASE || 'http://localhost:3000').replace(/\/$/, '');
const form = document.querySelector('#set-form');
const list = document.querySelector('#set-list');
const feedback = document.querySelector('#form-feedback');
const errorBanner = document.querySelector('#error-banner');
const emptyState = document.querySelector('#empty-state');
const loadingState = document.querySelector('#loading-state');
const submitButton = document.querySelector('#submit-button');
const cancelEdit = document.querySelector('#cancel-edit');
const deleteDialog = document.querySelector('#delete-dialog');
const dateField = document.querySelector('#performed_on');
let sets = [];
let editingId = null;
let deletingId = null;

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
dateField.value = localDate();

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
function announce(message, kind = '') {
  feedback.textContent = message;
  feedback.className = `form-feedback ${kind}`;
}
function apiError(payload, fallback) {
  return payload && typeof payload.error === 'string' ? payload.error : fallback;
}
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
    });
  } catch {
    throw new Error('Could not reach the API. Check that the backend is running and the API URL is correct.');
  }
  if (response.status === 204) return null;
  let body;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) throw new Error(apiError(body, `Request failed (${response.status}).`));
  return body;
}
function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.querySelector('span:first-child').textContent = busy ? 'Saving…' : editingId ? 'Update set' : 'Save set';
}
function render() {
  const query = document.querySelector('#filter-exercise').value.trim().toLowerCase();
  const visible = sets.filter(item => item.exercise.toLowerCase().includes(query));
  document.querySelector('#total-sets').textContent = String(sets.length).padStart(2, '0');
  document.querySelector('#history-count').textContent = sets.length;
  loadingState.classList.add('hidden');
  emptyState.classList.toggle('hidden', sets.length > 0 || Boolean(query));
  if (sets.length && !visible.length) {
    list.innerHTML = '<div class="no-results">No exercise matches that filter yet.</div>';
  } else {
    list.innerHTML = visible.map(item => `
      <article class="set-card" data-id="${item.id}">
        <div class="set-date"><span class="date-day">${escapeHtml(formatDate(item.performed_on))}</span><span class="date-caption">WORKOUT</span></div>
        <div class="set-details"><h3>${escapeHtml(item.exercise)}</h3><p>${escapeHtml(item.notes || 'No note added')}</p></div>
        <div class="set-stats"><strong>${escapeHtml(item.weight)}<span> kg</span></strong><small>${escapeHtml(item.reps)} reps</small></div>
        <div class="set-actions"><button class="icon-button edit-button" type="button" data-edit="${item.id}" aria-label="Edit ${escapeHtml(item.exercise)}" title="Edit set">✎</button><button class="icon-button delete-icon" type="button" data-delete="${item.id}" aria-label="Delete ${escapeHtml(item.exercise)}" title="Delete set">×</button></div>
      </article>`).join('');
  }
  document.querySelector('.history-footnote').classList.toggle('hidden', sets.length === 0);
}
async function loadSets() {
  loadingState.classList.remove('hidden');
  errorBanner.classList.add('hidden');
  try {
    const data = await request('/sets');
    if (!Array.isArray(data)) throw new Error('The server returned an unexpected response.');
    sets = data;
    render();
  } catch (error) {
    loadingState.classList.add('hidden');
    errorBanner.textContent = error.message;
    errorBanner.classList.remove('hidden');
    list.innerHTML = '';
    emptyState.classList.add('hidden');
  }
}
function resetForm() {
  form.reset();
  dateField.value = localDate();
  editingId = null;
  document.querySelector('#form-title').textContent = 'Log a set';
  document.querySelector('#form-mode').textContent = 'NEW ENTRY';
  submitButton.querySelector('span:first-child').textContent = 'Save set';
  cancelEdit.classList.add('hidden');
  announce('');
}
function beginEdit(id) {
  const item = sets.find(row => row.id === id);
  if (!item) return;
  editingId = id;
  form.elements.exercise.value = item.exercise;
  form.elements.weight.value = item.weight;
  form.elements.reps.value = item.reps;
  form.elements.performed_on.value = item.performed_on;
  form.elements.notes.value = item.notes;
  document.querySelector('#form-title').textContent = 'Edit this set';
  document.querySelector('#form-mode').textContent = 'EDITING';
  submitButton.querySelector('span:first-child').textContent = 'Update set';
  cancelEdit.classList.remove('hidden');
  announce('Update the details, then save your changes.');
  document.querySelector('#log-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  form.elements.exercise.focus({ preventScroll: true });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const payload = {
    exercise: form.elements.exercise.value.trim(),
    weight: form.elements.weight.value,
    reps: form.elements.reps.value,
    performed_on: form.elements.performed_on.value,
    notes: form.elements.notes.value.trim()
  };
  if (payload.exercise.length < 2 || payload.exercise.length > 80) return announce('Enter an exercise name (2–80 characters).', 'error');
  if (payload.weight === '' || !Number.isFinite(Number(payload.weight)) || Number(payload.weight) < 0) return announce('Enter a valid weight of 0 kg or more.', 'error');
  if (!Number.isInteger(Number(payload.reps)) || Number(payload.reps) < 1) return announce('Reps must be a whole number greater than 0.', 'error');
  if (!payload.performed_on) return announce('Choose the workout date.', 'error');
  if (payload.notes.length > 240) return announce('Notes must be 240 characters or fewer.', 'error');
  setBusy(true);
  try {
    await request(editingId ? `/sets/${editingId}` : '/sets', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    const wasEditing = editingId !== null;
    resetForm();
    await loadSets();
    announce(wasEditing ? 'Set updated. Your next session is ready.' : 'Set saved. You’ll know where to start next time.', 'success');
  } catch (error) {
    announce(error.message, 'error');
  } finally {
    setBusy(false);
    if (!editingId) submitButton.querySelector('span:first-child').textContent = 'Save set';
  }
});

list.addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit]');
  const deleteButton = event.target.closest('[data-delete]');
  if (editButton) beginEdit(Number(editButton.dataset.edit));
  if (deleteButton) {
    deletingId = Number(deleteButton.dataset.delete);
    deleteDialog.showModal();
  }
});
document.querySelector('#confirm-delete').addEventListener('click', async event => {
  event.preventDefault();
  if (!deletingId) return;
  const id = deletingId;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await request(`/sets/${id}`, { method: 'DELETE' });
    if (editingId === id) resetForm();
    deleteDialog.close();
    deletingId = null;
    await loadSets();
    announce('Set removed from your history.', 'success');
  } catch (error) {
    deleteDialog.close();
    errorBanner.textContent = error.message;
    errorBanner.classList.remove('hidden');
  } finally {
    button.disabled = false;
  }
});
deleteDialog.addEventListener('close', () => { deletingId = null; });
cancelEdit.addEventListener('click', resetForm);
document.querySelector('#filter-exercise').addEventListener('input', render);
document.querySelector('#empty-cta').addEventListener('click', () => form.elements.exercise.focus());
loadSets();
