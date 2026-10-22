/**
 * ============================================================================
 * MODUL INTEGRASI MONDAY.COM (GraphQL API v2)
 * ============================================================================
 * 
 * Modul ini menyediakan fungsi helper yang mudah dipahami untuk berkomunikasi
 * dengan API monday.com (https://api.monday.com/v2) menggunakan GraphQL.
 * 
 * Konsep Utama Monday.com:
 * 1. Board: Papan kerja / project tempat task disimpan. Memiliki ID unik (cth: "1234567890").
 * 2. Item: Baris data / Task di dalam board.
 * 3. Column: Kolom atribut (misal: "status", "priority", "date", "person").
 * 4. API Token: Kunci otentikasi Personal API Token dari Monday.com.
 */

import { Task, TaskPriority, TaskStatus, normalizeMondayStatus, toMondayStatusLabel } from './task';
import {
	QUERY_ME,
	QUERY_LIST_BOARDS,
	QUERY_GET_BOARD_ITEMS,
	MUTATION_CREATE_ITEM,
	MUTATION_UPDATE_STATUS,
	MUTATION_DELETE_ITEM,
} from './graphql';

export const MONDAY_API_URL = 'https://api.monday.com/v2';

/**
 * Task demo awal untuk mode simulasi jika pengguna belum memasukkan API Key.
 */
export const DEFAULT_MOCK_TASKS: Task[] = [
	{
		id: 'mock-1',
		title: '🎨 Mendesain Tampilan Dashboard Baru',
		status: 'todo',
		priority: 'high',
		mondayId: 'demo-101',
		createdAt: new Date().toISOString(),
	},
	{
		id: 'mock-2',
		title: '⚡ Integrasi Monday.com GraphQL API',
		status: 'working',
		priority: 'high',
		mondayId: 'demo-102',
		createdAt: new Date().toISOString(),
	},
	{
		id: 'mock-3',
		title: '📝 Menulis Dokumentasi Panduan Penggunaan',
		status: 'done',
		priority: 'medium',
		mondayId: 'demo-103',
		createdAt: new Date().toISOString(),
	},
	{
		id: 'mock-4',
		title: '🧪 Melakukan Pengetesan Fitur Sinkronisasi',
		status: 'working',
		priority: 'low',
		mondayId: 'demo-104',
		createdAt: new Date().toISOString(),
	},
];

export interface MondayApiCredentials {
	apiKey?: string;
	boardId?: string;
}

interface MondayGraphQLError {
	message: string;
}

export interface MondayBoardSummary {
	id: string;
	name: string;
	description?: string;
}

/**
 * Eksekutor query/mutasi GraphQL ke Monday.com API v2
 */
export async function executeMondayGraphQL<T = unknown>(
	query: string,
	variables: Record<string, unknown> = {},
	apiKey?: string
): Promise<T> {
	const token = apiKey || process.env.MONDAY_API_KEY;

	if (!token) {
		throw new Error('API Key Monday.com belum disetel. Harap masukkan API Key.');
	}

	const response = await fetch(MONDAY_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: token,
			'API-Version': '2024-01',
		},
		body: JSON.stringify({ query, variables }),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Gagal menghubungi Monday.com (${response.status}): ${text}`);
	}

	const result = (await response.json()) as { data?: T; errors?: MondayGraphQLError[] };

	if (result.errors && result.errors.length > 0) {
		const errorMessage = result.errors.map((e) => e.message).join(', ');
		throw new Error(`Monday.com GraphQL Error: ${errorMessage}`);
	}

	return result.data as T;
}

/**
 * 1. Tes koneksi ke akun Monday.com pengguna (GraphQL Query: me)
 */
export async function testMondayConnection(apiKey?: string) {
	const data = await executeMondayGraphQL<{ me: { id: string; name: string; email: string } }>(
		QUERY_ME,
		{},
		apiKey
	);

	return data.me;
}

/**
 * 2. Mengambil daftar seluruh papan kerja (boards) pengguna dari Monday.com
 */
export async function fetchUserBoards(apiKey?: string): Promise<MondayBoardSummary[]> {
	const data = await executeMondayGraphQL<{
		boards: Array<{ id: string; name: string; description?: string }>;
	}>(QUERY_LIST_BOARDS, {}, apiKey);

	return data.boards || [];
}

/**
 * 3. Mengambil daftar item/task dari Board Monday.com tertentu (GraphQL Query: boards)
 */
export async function fetchMondayBoard(boardId: string, apiKey?: string) {
	const data = await executeMondayGraphQL<{
		boards: Array<{
			id: string;
			name: string;
			description?: string;
			columns: Array<{ id: string; title: string; type: string }>;
			items_page: {
				cursor: string | null;
				items: Array<{
					id: string;
					name: string;
					state: string;
					column_values: Array<{
						id: string;
						type: string;
						text: string | null;
						value: string | null;
					}>;
				}>;
			};
		}>;
	}>(QUERY_GET_BOARD_ITEMS, { boardId: [boardId] }, apiKey);

	const board = data.boards?.[0];
	if (!board) {
		throw new Error(`Board dengan ID "${boardId}" tidak ditemukan atau tidak memiliki izin akses.`);
	}

	// Cari ID kolom status jika ada
	const statusColumn = board.columns.find(
		(col) => col.type === 'status' || col.id === 'status' || col.title.toLowerCase().includes('status')
	);

	// Cari kolom prioritas jika ada
	const priorityColumn = board.columns.find(
		(col) => col.title.toLowerCase().includes('priority') || col.title.toLowerCase().includes('prioritas')
	);

	const tasks: Task[] = board.items_page.items.map((item) => {
		const statusVal = item.column_values.find((c) => c.id === statusColumn?.id || c.type === 'status');
		const priorityVal = item.column_values.find((c) => c.id === priorityColumn?.id);

		let priority: TaskPriority = 'medium';
		if (priorityVal?.text) {
			const pText = priorityVal.text.toLowerCase();
			if (pText.includes('high') || pText.includes('tinggi')) priority = 'high';
			else if (pText.includes('low') || pText.includes('rendah')) priority = 'low';
		}

		return {
			id: item.id,
			title: item.name,
			status: normalizeMondayStatus(statusVal?.text),
			priority,
			mondayId: item.id,
		};
	});

	return {
		board: {
			id: board.id,
			name: board.name,
			description: board.description,
			statusColumnId: statusColumn?.id || 'status',
		},
		tasks,
	};
}

/**
 * 4. Membuat Task baru di Monday.com (GraphQL Mutation: create_item)
 */
export async function createMondayItem(
	boardId: string,
	itemName: string,
	status: TaskStatus = 'todo',
	priority: TaskPriority = 'medium',
	statusColumnId: string = 'status',
	apiKey?: string
) {
	// Buat item terlebih dahulu via mutasi GraphQL
	const data = await executeMondayGraphQL<{
		create_item: { id: string; name: string };
	}>(MUTATION_CREATE_ITEM, { boardId, itemName }, apiKey);

	const newItem = data.create_item;

	// Jika status bukan default 'todo' atau ingin diselaraskan, coba set nilai kolom status
	try {
		const statusLabel = toMondayStatusLabel(status);
		await executeMondayGraphQL(
			MUTATION_UPDATE_STATUS,
			{
				boardId,
				itemId: newItem.id,
				columnId: statusColumnId,
				value: statusLabel,
			},
			apiKey
		);
	} catch (e) {
		console.warn('Gagal mengatur label status kolom:', e);
	}

	return {
		id: newItem.id,
		title: newItem.name,
		status,
		priority,
		mondayId: newItem.id,
	} as Task;
}

/**
 * 5. Memperbarui status Task di Monday.com (GraphQL Mutation: change_simple_column_value)
 */
export async function updateMondayItemStatus(
	boardId: string,
	itemId: string,
	status: TaskStatus,
	statusColumnId: string = 'status',
	apiKey?: string
) {
	const statusLabel = toMondayStatusLabel(status);

	const data = await executeMondayGraphQL<{
		change_simple_column_value: { id: string };
	}>(
		MUTATION_UPDATE_STATUS,
		{
			boardId,
			itemId,
			columnId: statusColumnId,
			value: statusLabel,
		},
		apiKey
	);

	return data.change_simple_column_value;
}

/**
 * 6. Menghapus Task di Monday.com (GraphQL Mutation: delete_item)
 */
export async function deleteMondayItem(itemId: string, apiKey?: string) {
	const data = await executeMondayGraphQL<{
		delete_item: { id: string };
	}>(MUTATION_DELETE_ITEM, { itemId }, apiKey);

	return data.delete_item;
}
