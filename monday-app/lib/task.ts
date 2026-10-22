export type TaskStatus = 'todo' | 'working' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
	id: string | number;
	title: string;
	status: TaskStatus;
	priority?: TaskPriority;
	assignedTo?: string;
	mondayId?: string;
	createdAt?: string;
}

/**
 * Mapping status antara Monday.com dan FlowBoard
 */
export const STATUS_LABELS: Record<TaskStatus, { label: string; color: string; bg: string }> = {
	todo: {
		label: 'To Do',
		color: 'text-sky-700 dark:text-sky-300',
		bg: 'bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 border-sky-300 dark:border-sky-800',
	},
	working: {
		label: 'Working on it',
		color: 'text-amber-800 dark:text-amber-300',
		bg: 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border-amber-300 dark:border-amber-800',
	},
	done: {
		label: 'Done',
		color: 'text-emerald-800 dark:text-emerald-300',
		bg: 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border-emerald-300 dark:border-emerald-800',
	},
};

/**
 * Normalisasi status dari label string teks monday.com ke TaskStatus
 */
export function normalizeMondayStatus(label?: string | null): TaskStatus {
	if (!label) return 'todo';
	const clean = label.toLowerCase().trim();
	if (clean.includes('done') || clean.includes('selesai') || clean.includes('complete')) {
		return 'done';
	}
	if (clean.includes('work') || clean.includes('progress') || clean.includes('sedang')) {
		return 'working';
	}
	return 'todo';
}

/**
 * Label yang dikirim kembali ke Monday.com berdasarkan TaskStatus
 */
export function toMondayStatusLabel(status: TaskStatus): string {
	switch (status) {
		case 'done':
			return 'Done';
		case 'working':
			return 'Working on it';
		case 'todo':
		default:
			return 'To Do';
	}
}