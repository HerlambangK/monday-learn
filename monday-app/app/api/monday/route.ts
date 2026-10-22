import { NextResponse } from 'next/server';
import {
	fetchMondayBoard,
	fetchUserBoards,
	testMondayConnection,
	createMondayItem,
	updateMondayItemStatus,
	deleteMondayItem,
	executeMondayGraphQL,
	DEFAULT_MOCK_TASKS,
} from '@/lib/monday';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const apiKey = searchParams.get('apiKey') || process.env.MONDAY_API_KEY;
	const boardIdParam = searchParams.get('boardId') || process.env.MONDAY_BOARD_ID;
	const action = searchParams.get('action');

	// Jika pengguna hanya meminta daftar boards
	if (action === 'boards') {
		if (!apiKey) {
			return NextResponse.json({ success: false, error: 'API Key wajib diisi untuk melihat daftar board.' }, { status: 400 });
		}
		try {
			const boards = await fetchUserBoards(apiKey);
			return NextResponse.json({ success: true, boards });
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : 'Gagal mengambil daftar boards';
			return NextResponse.json({ success: false, error: msg }, { status: 500 });
		}
	}

	// Jika tidak ada konfigurasi API key sama sekali, kembalikan data mock untuk pengalaman instan
	if (!apiKey) {
		return NextResponse.json({
			isLive: false,
			message: 'Menjalankan dalam Mode Demo (Belum ada MONDAY_API_KEY).',
			board: {
				id: 'mock-board',
				name: 'FlowBoard Demo (Mock Mode)',
				description: 'Papan simulasi lokal untuk memahami alur kerja integrasi monday.com',
				statusColumnId: 'status',
			},
			availableBoards: [],
			tasks: DEFAULT_MOCK_TASKS,
		});
	}

	try {
		// Jika pengguna punya API Key tetapi belum memilih boardId:
		// Tarik semua board milik akun Monday.com mereka dan pilih board pertama otomatis!
		let activeBoardId = boardIdParam;
		let userBoards: Array<{ id: string; name: string; description?: string }> = [];

		try {
			userBoards = await fetchUserBoards(apiKey);
			if (!activeBoardId && userBoards.length > 0) {
				activeBoardId = userBoards[0].id;
			}
		} catch {
			// fallback jika fetchUserBoards gagal
		}

		if (!activeBoardId) {
			return NextResponse.json({
				isLive: true,
				message: 'Terhubung ke Monday.com, namun belum ada board aktif.',
				board: {
					id: '',
					name: 'Pilih Board Monday.com Anda',
					description: 'Silakan pilih salah satu board di pengaturan.',
					statusColumnId: 'status',
				},
				availableBoards: userBoards,
				tasks: [],
			});
		}

		const result = await fetchMondayBoard(activeBoardId, apiKey);
		return NextResponse.json({
			isLive: true,
			message: 'Berhasil membaca data langsung dari Monday.com!',
			availableBoards: userBoards,
			...result,
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Gagal mengambil data dari Monday.com';
		return NextResponse.json(
			{
				isLive: false,
				error: errorMessage,
				board: {
					id: boardIdParam || 'error-board',
					name: 'Papan (Error Koneksi)',
					statusColumnId: 'status',
				},
				tasks: DEFAULT_MOCK_TASKS,
			},
			{ status: 200 } // Kembalikan 200 dengan info error agar UI tetap responsif
		);
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { action, apiKey: clientApiKey, boardId: clientBoardId } = body;
		const apiKey = clientApiKey || process.env.MONDAY_API_KEY;
		const boardId = clientBoardId || process.env.MONDAY_BOARD_ID;

		// 1. Aksi uji koneksi
		if (action === 'test') {
			if (!apiKey) {
				return NextResponse.json({ success: false, error: 'API Key wajib diisi.' }, { status: 400 });
			}
			const user = await testMondayConnection(apiKey);
			return NextResponse.json({
				success: true,
				message: `Koneksi berhasil! Terhubung sebagai ${user.name} (${user.email})`,
				user,
			});
		}

		// 2. Aksi buat task baru
		if (action === 'create') {
			const { title, status = 'todo', priority = 'medium', statusColumnId = 'status' } = body;

			if (!title || !title.trim()) {
				return NextResponse.json({ success: false, error: 'Judul task tidak boleh kosong.' }, { status: 400 });
			}

			// Jika mode demo
			if (!apiKey || !boardId) {
				const mockTask = {
					id: `mock-${Date.now()}`,
					title: title.trim(),
					status,
					priority,
					mondayId: `demo-${Math.floor(Math.random() * 900) + 100}`,
					createdAt: new Date().toISOString(),
				};
				return NextResponse.json({
					success: true,
					isLive: false,
					task: mockTask,
					message: 'Task berhasil ditambahkan (Mode Demo)',
				});
			}

			// Mode Live
			const newTask = await createMondayItem(
				boardId,
				title.trim(),
				status,
				priority,
				statusColumnId,
				apiKey
			);

			return NextResponse.json({
				success: true,
				isLive: true,
				task: newTask,
				message: 'Task berhasil dibuat di Monday.com!',
			});
		}

		// 3. Aksi ambil daftar boards akun pengguna
		if (action === 'get_boards') {
			if (!apiKey) {
				return NextResponse.json({ success: false, error: 'API Key wajib diisi.' }, { status: 400 });
			}
			const boards = await fetchUserBoards(apiKey);
			return NextResponse.json({ success: true, boards });
		}

		// 4. Aksi eksekusi custom GraphQL Query (GraphQL Explorer/Tester)
		if (action === 'run_graphql') {
			const { query, variables = {} } = body;
			if (!query) {
				return NextResponse.json({ success: false, error: 'Query GraphQL wajib diisi.' }, { status: 400 });
			}
			const result = await executeMondayGraphQL(query, variables, apiKey);
			return NextResponse.json({ success: true, data: result });
		}

		return NextResponse.json({ success: false, error: 'Aksi tidak dikenali.' }, { status: 400 });
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan pada server.';
		return NextResponse.json(
			{ success: false, error: errorMessage },
			{ status: 500 }
		);
	}
}

export async function PATCH(request: Request) {
	try {
		const body = await request.json();
		const { itemId, status, statusColumnId = 'status', apiKey: clientApiKey, boardId: clientBoardId } = body;
		const apiKey = clientApiKey || process.env.MONDAY_API_KEY;
		const boardId = clientBoardId || process.env.MONDAY_BOARD_ID;

		if (!itemId || !status) {
			return NextResponse.json({ success: false, error: 'itemId dan status wajib diisi.' }, { status: 400 });
		}

		// Mode demo
		if (!apiKey || !boardId || String(itemId).startsWith('mock-')) {
			return NextResponse.json({
				success: true,
				isLive: false,
				message: `Status task berhasil diperbarui menjadi "${status}" (Mode Demo)`,
			});
		}

		// Mode Live
		await updateMondayItemStatus(boardId, itemId, status, statusColumnId, apiKey);

		return NextResponse.json({
			success: true,
			isLive: true,
			message: `Status berhasil disinkronkan ke Monday.com: "${status}"`,
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Gagal mengubah status di Monday.com';
		return NextResponse.json(
			{ success: false, error: errorMessage },
			{ status: 500 }
		);
	}
}

export async function DELETE(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const itemId = searchParams.get('itemId');
		const clientApiKey = searchParams.get('apiKey');
		const apiKey = clientApiKey || process.env.MONDAY_API_KEY;

		if (!itemId) {
			return NextResponse.json({ success: false, error: 'itemId wajib diisi.' }, { status: 400 });
		}

		// Mode demo
		if (!apiKey || itemId.startsWith('mock-')) {
			return NextResponse.json({
				success: true,
				isLive: false,
				message: 'Task berhasil dihapus (Mode Demo)',
			});
		}

		// Mode Live
		await deleteMondayItem(itemId, apiKey);

		return NextResponse.json({
			success: true,
			isLive: true,
			message: 'Task berhasil dihapus dari Monday.com',
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus task di Monday.com';
		return NextResponse.json(
			{ success: false, error: errorMessage },
			{ status: 500 }
		);
	}
}
