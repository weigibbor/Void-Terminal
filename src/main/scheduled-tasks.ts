interface ScheduledTask {
  id: string;
  connectionId: string;
  command: string;
  schedule: string; // Cron expression or 'on-connect'
  enabled: boolean;
  lastRun: number | null;
}

export class ScheduledTasksEngine {
  private tasks: ScheduledTask[] = [];
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  addTask(task: Omit<ScheduledTask, 'id' | 'lastRun'>): ScheduledTask {
    const newTask: ScheduledTask = {
      ...task,
      id: Math.random().toString(36).substring(2, 10),
      lastRun: null,
    };
    this.tasks.push(newTask);
    return newTask;
  }

  removeTask(id: string): void {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
  }

  getOnConnectTasks(connectionId: string): ScheduledTask[] {
    return this.tasks.filter(
      (t) => t.connectionId === connectionId && t.schedule === 'on-connect' && t.enabled,
    );
  }

  getTasks(): ScheduledTask[] {
    return this.tasks;
  }

  toggleTask(id: string): void {
    const task = this.tasks.find((t) => t.id === id);
    if (task) task.enabled = !task.enabled;
  }

  stopAll(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }
}
