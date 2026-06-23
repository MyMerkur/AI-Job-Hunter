import { useEffect, useState } from 'react';
import type { Task } from '@ai-job-hunter/shared';
import { getTasks } from '../lib/api.js';

export function LogsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  async function refresh() { setError(undefined); try { setTasks(await getTasks()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Task listesi alınamadı.'); } finally { setIsLoading(false); } }
  useEffect(() => { void refresh(); }, []);
  return <><p className="eyebrow">TASK LOGS</p><h1>Worker görevleri</h1><p className="lede">MongoDB task kuyruğundaki işlerin durumunu ve worker loglarını takip edin.</p><section><div className="section-heading"><div><p className="section-label">KUYRUK</p><h2>Görevler</h2></div><button className="copy-button" onClick={() => void refresh()}>Yenile</button></div>{error && <p className="form-error">{error}</p>}{isLoading ? <p className="muted">Task’ler yükleniyor…</p> : tasks.length === 0 ? <p className="muted">Kuyrukta task yok.</p> : <ul className="task-list">{tasks.map((task) => <li key={task.id}><div><strong>{task.type}</strong><span className={`task-status ${task.status}`}>{task.status}</span><small>{new Date(task.createdAt).toLocaleString('tr-TR')} · deneme: {task.attempts}</small>{task.error && <p className="form-error">{task.error}</p>}</div>{task.logs.length > 0 && <ul>{task.logs.map((log, index) => <li key={`${log.createdAt}-${index}`}>{log.message}</li>)}</ul>}</li>)}</ul>}</section></>;
}
