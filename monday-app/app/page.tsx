'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Task, TaskPriority, TaskStatus, STATUS_LABELS } from '@/lib/task';
import { GRAPHQL_PRESETS } from '@/lib/graphql';
import {
	CheckCircle2,
	Clock,
	ListTodo,
	Plus,
	RefreshCw,
	Settings,
	HelpCircle,
	Trash2,
	ShieldCheck,
	LayoutGrid,
	List,
	ArrowRight,
	Sparkles,
	AlertCircle,
	Check,
	Layers,
	Code2,
	Play,
	ChevronDown,
} from 'lucide-react';

export default function HomePage() {
	// State data task & board
	const [tasks, setTasks] = useState<Task[]>([]);
	const [boardInfo, setBoardInfo] = useState<{
		id: string;
		name: string;
		description?: string;
		statusColumnId?: string;
	}>({
		id: 'mock-board',
		name: 'FlowBoard (Mode Demo)',
		description: 'Papan simulasi interaktif integrasi Monday.com',
		statusColumnId: 'status',
	});

	// Daftar boards yang tersedia di akun Monday.com pengguna
	const [availableBoards, setAvailableBoards] = useState<Array<{ id: string; name: string }>>([]);

	// Status koneksi
	const [isLive, setIsLive] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);
	const [syncing, setSyncing] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	// Mode tampilan: Kanban (Kolom) vs List (Daftar)
	const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

	// Modal / Panel state
	const [showSettings, setShowSettings] = useState<boolean>(false);
	const [showGuide, setShowGuide] = useState<boolean>(false);
	const [showGraphQLExplorer, setShowGraphQLExplorer] = useState<boolean>(false);

	// Form Credentials - diinisialisasi dengan lazy initial state
	const [apiKey, setApiKey] = useState<string>(() => {
		if (typeof window !== 'undefined') {
			return localStorage.getItem('flowboard_monday_key') || '';
		}
		return '';
	});
	const [boardId, setBoardId] = useState<string>(() => {
		if (typeof window !== 'undefined') {
			return localStorage.getItem('flowboard_monday_board') || '';
		}
		return '';
	});
	const [testingConn, setTestingConn] = useState<boolean>(false);
	const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

	// State GraphQL Explorer
	const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
	const [customQuery, setCustomQuery] = useState<string>(GRAPHQL_PRESETS[0].query.trim());
	const [queryVariables, setQueryVariables] = useState<string>(JSON.stringify(GRAPHQL_PRESETS[0].variables, null, 2));
	const [graphqlResponse, setGraphqlResponse] = useState<string>('');
	const [runningQuery, setRunningQuery] = useState<boolean>(false);

	// Form Tambah Task
	const [newTaskTitle, setNewTaskTitle] = useState<string>('');
	const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
	const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo');
	const [creatingTask, setCreatingTask] = useState<boolean>(false);

	// Fungsi mengambil data board dari API backend (untuk trigger manual / refresh)
	const loadData = useCallback(async (customKey?: string, customBoard?: string) => {
		const activeKey = customKey !== undefined ? customKey : (typeof window !== 'undefined' ? localStorage.getItem('flowboard_monday_key') || '' : '');
		const activeBoard = customBoard !== undefined ? customBoard : (typeof window !== 'undefined' ? localStorage.getItem('flowboard_monday_board') || '' : '');

		setSyncing(true);
		setError(null);

		try {
			const queryParams = new URLSearchParams();
			if (activeKey) queryParams.set('apiKey', activeKey);
			if (activeBoard) queryParams.set('boardId', activeBoard);

			const res = await fetch(`/api/monday?${queryParams.toString()}`);
			const data = await res.json();

			if (data.tasks) {
				setTasks(data.tasks);
			}
			if (data.board) {
				setBoardInfo(data.board);
				if (data.board.id && data.board.id !== 'mock-board') {
					setBoardId(data.board.id);
					if (typeof window !== 'undefined') {
						localStorage.setItem('flowboard_monday_board', data.board.id);
					}
				}
			}
			if (data.availableBoards) {
				setAvailableBoards(data.availableBoards);
			}
			setIsLive(Boolean(data.isLive));

			if (data.error) {
				setError(data.error);
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Gagal memuat data dari server.';
			setError(msg);
		} finally {
			setLoading(false);
			setSyncing(false);
		}
	}, []);

	// Load saat komponen pertama dipasang
	useEffect(() => {
		let isMounted = true;
		const initLoad = async () => {
			const activeKey = typeof window !== 'undefined' ? localStorage.getItem('flowboard_monday_key') || '' : '';
			const activeBoard = typeof window !== 'undefined' ? localStorage.getItem('flowboard_monday_board') || '' : '';

			try {
				const queryParams = new URLSearchParams();
				if (activeKey) queryParams.set('apiKey', activeKey);
				if (activeBoard) queryParams.set('boardId', activeBoard);

				const res = await fetch(`/api/monday?${queryParams.toString()}`);
				const data = await res.json();
				if (!isMounted) return;

				if (data.tasks) setTasks(data.tasks);
				if (data.board) {
					setBoardInfo(data.board);
					if (data.board.id && data.board.id !== 'mock-board') {
						setBoardId(data.board.id);
					}
				}
				if (data.availableBoards) {
					setAvailableBoards(data.availableBoards);
				}
				setIsLive(Boolean(data.isLive));
				if (data.error) setError(data.error);
			} catch (err: unknown) {
				if (!isMounted) return;
				const msg = err instanceof Error ? err.message : 'Gagal memuat data dari server.';
				setError(msg);
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		void initLoad();
		return () => {
			isMounted = false;
		};
	}, []);

	// Simpan & Terapkan Kredensial
	const handleSaveCredentials = (e: React.FormEvent) => {
		e.preventDefault();
		if (typeof window !== 'undefined') {
			localStorage.setItem('flowboard_monday_key', apiKey.trim());
			localStorage.setItem('flowboard_monday_board', boardId.trim());
		}
		setShowSettings(false);
		setNotice('Pengaturan koneksi berhasil disimpan. Membaca data Monday.com...');
		setTimeout(() => setNotice(null), 4000);
		loadData(apiKey.trim(), boardId.trim());
	};

	// Mengganti board aktif
	const handleSwitchBoard = (newBoardId: string) => {
		setBoardId(newBoardId);
		if (typeof window !== 'undefined') {
			localStorage.setItem('flowboard_monday_board', newBoardId);
		}
		setNotice(`Beralih ke Board ID: ${newBoardId}`);
		setTimeout(() => setNotice(null), 3000);
		loadData(apiKey.trim(), newBoardId);
	};

	// Uji Koneksi API Key & Ambil daftar board
	const handleTestConnection = async () => {
		if (!apiKey.trim()) {
			setTestResult({ success: false, message: 'Harap masukkan API Key terlebih dahulu.' });
			return;
		}

		setTestingConn(true);
		setTestResult(null);

		try {
			const res = await fetch('/api/monday', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'test', apiKey: apiKey.trim() }),
			});
			const data = await res.json();

			if (res.ok && data.success) {
				setTestResult({ success: true, message: data.message });

				// Ambil juga daftar board
				const boardRes = await fetch(`/api/monday?action=boards&apiKey=${encodeURIComponent(apiKey.trim())}`);
				const boardData = await boardRes.json();
				if (boardData.success && boardData.boards) {
					setAvailableBoards(boardData.boards);
					if (!boardId && boardData.boards.length > 0) {
						setBoardId(boardData.boards[0].id);
					}
				}
			} else {
				setTestResult({ success: false, message: data.error || 'Uji koneksi gagal.' });
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Tidak dapat menghubungi server.';
			setTestResult({ success: false, message: msg });
		} finally {
			setTestingConn(false);
		}
	};

	// Reset ke Mode Demo
	const handleResetToDemo = () => {
		setApiKey('');
		setBoardId('');
		setAvailableBoards([]);
		if (typeof window !== 'undefined') {
			localStorage.removeItem('flowboard_monday_key');
			localStorage.removeItem('flowboard_monday_board');
		}
		setShowSettings(false);
		setTestResult(null);
		setNotice('Kembali ke Mode Demo (Simulasi Lokal)');
		setTimeout(() => setNotice(null), 3000);
		loadData('', '');
	};

	// Tambah Task Baru
	const handleCreateTask = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTaskTitle.trim()) return;

		setCreatingTask(true);
		setError(null);

		try {
			const res = await fetch('/api/monday', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'create',
					title: newTaskTitle.trim(),
					status: newTaskStatus,
					priority: newTaskPriority,
					statusColumnId: boardInfo.statusColumnId,
					apiKey: apiKey.trim() || undefined,
					boardId: boardId.trim() || undefined,
				}),
			});

			const data = await res.json();
			if (data.success && data.task) {
				setTasks((prev) => [data.task, ...prev]);
				setNewTaskTitle('');
				setNotice(data.isLive ? '✅ Task berhasil dibuat via GraphQL ke Monday.com!' : '✅ Task ditambahkan (Mode Demo)');
				setTimeout(() => setNotice(null), 3000);
			} else {
				throw new Error(data.error || 'Gagal menambahkan task');
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Gagal membuat task';
			setError(msg);
		} finally {
			setCreatingTask(false);
		}
	};

	// Ubah Status Task (Siklus: todo -> working -> done -> todo)
	const handleCycleStatus = async (task: Task) => {
		const nextStatusMap: Record<TaskStatus, TaskStatus> = {
			todo: 'working',
			working: 'done',
			done: 'todo',
		};
		const nextStatus = nextStatusMap[task.status];

		// Optimistic UI Update
		setTasks((prev) =>
			prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
		);

		try {
			const res = await fetch('/api/monday', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					itemId: task.mondayId || task.id,
					status: nextStatus,
					statusColumnId: boardInfo.statusColumnId,
					apiKey: apiKey.trim() || undefined,
					boardId: boardId.trim() || undefined,
				}),
			});

			const data = await res.json();
			if (!data.success) {
				// Rollback jika gagal
				setTasks((prev) =>
					prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
				);
				setError(data.error || 'Gagal memperbarui status di Monday.com');
			}
		} catch (err: unknown) {
			setTasks((prev) =>
				prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
			);
			const msg = err instanceof Error ? err.message : 'Koneksi gagal saat mengubah status';
			setError(msg);
		}
	};

	// Hapus Task
	const handleDeleteTask = async (task: Task) => {
		if (!confirm(`Hapus task "${task.title}"?`)) return;

		// Optimistic UI delete
		setTasks((prev) => prev.filter((t) => t.id !== task.id));

		try {
			const queryParams = new URLSearchParams({
				itemId: String(task.mondayId || task.id),
			});
			if (apiKey) queryParams.set('apiKey', apiKey.trim());

			const res = await fetch(`/api/monday?${queryParams.toString()}`, {
				method: 'DELETE',
			});

			const data = await res.json();
			if (!data.success) {
				// Kembalikan task jika gagal
				setTasks((prev) => [task, ...prev]);
				setError(data.error || 'Gagal menghapus task di Monday.com');
			}
		} catch (err: unknown) {
			setTasks((prev) => [task, ...prev]);
			const msg = err instanceof Error ? err.message : 'Koneksi gagal saat menghapus task';
			setError(msg);
		}
	};

	// Eksekusi Custom Query di GraphQL Explorer
	const handleRunGraphQLQuery = async () => {
		if (!apiKey.trim()) {
			setError('Untuk menjalankan GraphQL Explorer langsung ke Monday.com, masukkan API Key terlebih dahulu di menu Pengaturan.');
			return;
		}

		setRunningQuery(true);
		setGraphqlResponse('Mengirim query GraphQL ke api.monday.com/v2...');

		try {
			let parsedVars = {};
			try {
				if (queryVariables.trim()) {
					parsedVars = JSON.parse(queryVariables);
				}
			} catch {
				throw new Error('Format JSON Variables tidak valid.');
			}

			// Ganti placeholder jika ada
			if (typeof parsedVars === 'object' && parsedVars !== null) {
				const str = JSON.stringify(parsedVars).replaceAll('REPLACE_WITH_YOUR_BOARD_ID', boardId || '123456');
				parsedVars = JSON.parse(str);
			}

			const res = await fetch('/api/monday', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'run_graphql',
					apiKey: apiKey.trim(),
					query: customQuery,
					variables: parsedVars,
				}),
			});

			const data = await res.json();
			setGraphqlResponse(JSON.stringify(data, null, 2));
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Gagal mengeksekusi GraphQL query';
			setGraphqlResponse(`Error:\n${msg}`);
		} finally {
			setRunningQuery(false);
		}
	};

	// Pilih preset GraphQL
	const handleSelectPreset = (idx: number) => {
		setSelectedPresetIndex(idx);
		const preset = GRAPHQL_PRESETS[idx];
		setCustomQuery(preset.query.trim());
		const vars = { ...preset.variables };
		if ('boardId' in vars) {
			if (Array.isArray(vars.boardId)) {
				vars.boardId = [boardId || '123456789'];
			} else {
				vars.boardId = boardId || '123456789';
			}
		}
		setQueryVariables(JSON.stringify(vars, null, 2));
		setGraphqlResponse('');
	};

	// Statistik Ringkasan
	const todoTasks = tasks.filter((t) => t.status === 'todo');
	const workingTasks = tasks.filter((t) => t.status === 'working');
	const doneTasks = tasks.filter((t) => t.status === 'done');
	const percentDone = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

	return (
		<main className="min-h-screen bg-slate-50/70 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
			{/* NAVBAR ATAS */}
			<header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 text-white shadow-md shadow-blue-500/20">
							<Layers className="h-5 w-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
									FlowBoard
								</h1>
								<span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
									GraphQL v2
								</span>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Integrasi Simpel Monday.com API v2
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Status badge: Live vs Demo */}
						{isLive ? (
							<div className="hidden items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 sm:flex dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
								<span className="relative flex h-2 w-2">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
									<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
								</span>
								<span>Live: {boardInfo.name}</span>
							</div>
						) : (
							<div className="hidden items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 sm:flex dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
								<span className="h-2 w-2 rounded-full bg-amber-500"></span>
								<span>Mode Demo / Simulasi</span>
							</div>
						)}

						{/* Tombol GraphQL Explorer */}
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowGraphQLExplorer(!showGraphQLExplorer)}
							className="gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
						>
							<Code2 className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">GraphQL Explorer</span>
						</Button>

						{/* Tombol Panduan */}
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowGuide(!showGuide)}
							className="gap-1.5 text-xs text-slate-700 dark:text-slate-300"
						>
							<HelpCircle className="h-3.5 w-3.5 text-blue-500" />
							<span>Panduan</span>
						</Button>

						{/* Tombol Pengaturan Koneksi */}
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowSettings(!showSettings)}
							className="gap-1.5 text-xs text-slate-700 dark:text-slate-300"
						>
							<Settings className="h-3.5 w-3.5 text-slate-500" />
							<span>Koneksi Monday</span>
						</Button>

						{/* Tombol Refresh Sync */}
						<Button
							variant="default"
							size="sm"
							onClick={() => loadData()}
							disabled={syncing}
							className="gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700"
						>
							<RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
							<span className="hidden sm:inline">{syncing ? 'Menyinkronkan...' : 'Sinkron'}</span>
						</Button>
					</div>
				</div>
			</header>

			{/* BODY CONTAINER */}
			<div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
				{/* NOTIFIKASI SUKSES / INFO */}
				{notice && (
					<div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
						<Check className="h-4 w-4 shrink-0 text-emerald-600" />
						<span>{notice}</span>
					</div>
				)}

				{/* NOTIFIKASI ERROR JIKA ADA */}
				{error && (
					<div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 shadow-sm dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
						<div className="flex items-center gap-2">
							<AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
							<span>{error}</span>
						</div>
						<Button
							variant="ghost"
							size="xs"
							onClick={() => setError(null)}
							className="text-rose-700 hover:bg-rose-100 dark:text-rose-300"
						>
							Tutup
						</Button>
					</div>
				)}

				{/* INTERACTIVE GRAPHQL EXPLORER (INSPECTOR) */}
				{showGraphQLExplorer && (
					<Card className="border-indigo-300 bg-white shadow-xl dark:border-indigo-900 dark:bg-slate-900">
						<CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
										<Code2 className="h-4 w-4" />
									</div>
									<div>
										<CardTitle className="text-base font-semibold">
											GraphQL Explorer (Monday.com API v2)
										</CardTitle>
										<CardDescription className="text-xs">
											Eksplorasi dan jalankan query GraphQL langsung ke endpoint https://api.monday.com/v2
										</CardDescription>
									</div>
								</div>
								<Button
									variant="ghost"
									size="xs"
									onClick={() => setShowGraphQLExplorer(false)}
									className="text-slate-400 hover:text-slate-700"
								>
									✕
								</Button>
							</div>

							{/* Pilihan Preset Query */}
							<div className="mt-3 flex flex-wrap gap-1.5 pt-2">
								{GRAPHQL_PRESETS.map((preset, idx) => (
									<button
										key={preset.name}
										onClick={() => handleSelectPreset(idx)}
										className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
											selectedPresetIndex === idx
												? 'bg-indigo-600 text-white'
												: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
										}`}
									>
										{preset.name}
									</button>
								))}
							</div>
						</CardHeader>

						<CardContent className="pt-4 space-y-4">
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								{/* Query Editor */}
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
											GraphQL Query / Mutation:
										</span>
										<Button
											size="xs"
											onClick={handleRunGraphQLQuery}
											disabled={runningQuery}
											className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
										>
											<Play className="h-3 w-3" />
											<span>{runningQuery ? 'Mengeksekusi...' : 'Jalankan Query'}</span>
										</Button>
									</div>
									<textarea
										rows={10}
										value={customQuery}
										onChange={(e) => setCustomQuery(e.target.value)}
										className="w-full rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-emerald-400 outline-none focus:border-indigo-500 dark:border-slate-800"
									/>

									<span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
										Query Variables (JSON):
									</span>
									<textarea
										rows={3}
										value={queryVariables}
										onChange={(e) => setQueryVariables(e.target.value)}
										className="w-full rounded-lg border border-slate-200 bg-slate-950 p-2 font-mono text-xs text-sky-300 outline-none focus:border-indigo-500 dark:border-slate-800"
									/>
								</div>

								{/* JSON Response View */}
								<div className="space-y-2">
									<span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
										Hasil Response Monday.com (JSON):
									</span>
									<pre className="h-[310px] overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-slate-200 dark:border-slate-800">
										{graphqlResponse || '// Klik "Jalankan Query" untuk melihat hasil response langsung dari Monday.com'}
									</pre>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* MODAL / DRAWER PENGATURAN KONEKSI MONDAY.COM */}
				{showSettings && (
					<Card className="border-indigo-200 bg-white shadow-lg dark:border-indigo-900/60 dark:bg-slate-900">
						<CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
										<Settings className="h-4 w-4" />
									</div>
									<div>
										<CardTitle className="text-base font-semibold">Pengaturan Integrasi Monday.com</CardTitle>
										<CardDescription className="text-xs">
											Masukkan Personal API Token Anda untuk membaca data board Monday.com secara langsung.
										</CardDescription>
									</div>
								</div>
								<Button
									variant="ghost"
									size="xs"
									onClick={() => setShowSettings(false)}
									className="text-slate-400 hover:text-slate-700"
								>
									✕
								</Button>
							</div>
						</CardHeader>

						<CardContent className="pt-4">
							<form onSubmit={handleSaveCredentials} className="space-y-4">
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<div>
										<label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
											1. Personal API Token Monday.com
										</label>
										<Input
											type="password"
											placeholder="eyJhbGciOi..."
											value={apiKey}
											onChange={(e) => setApiKey(e.target.value)}
											className="text-xs"
										/>
										<p className="mt-1 text-[11px] text-slate-500">
											Didapat dari Monday.com &gt; Profil Avatar (kiri bawah) &gt; Developers &gt; My Access Tokens
										</p>
									</div>

									<div>
										<label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
											2. Pilih Board Monday.com Anda
										</label>
										{availableBoards.length > 0 ? (
											<select
												value={boardId}
												onChange={(e) => setBoardId(e.target.value)}
												className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
											>
												<option value="">-- Pilih Board --</option>
												{availableBoards.map((b) => (
													<option key={b.id} value={b.id}>
														{b.name} (ID: {b.id})
													</option>
												))}
											</select>
										) : (
											<Input
												type="text"
												placeholder="Contoh: 1234567890 (atau klik Uji Koneksi untuk auto-detect)"
												value={boardId}
												onChange={(e) => setBoardId(e.target.value)}
												className="text-xs"
											/>
										)}
										<p className="mt-1 text-[11px] text-slate-500">
											Klik &quot;Uji Koneksi Token&quot; di bawah untuk menarik otomatis semua nama board Anda!
										</p>
									</div>
								</div>

								{/* Hasil Uji Koneksi */}
								{testResult && (
									<div
										className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
											testResult.success
												? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
												: 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
										}`}
									>
										{testResult.success ? (
											<CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
										) : (
											<AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
										)}
										<span>{testResult.message}</span>
									</div>
								)}

								<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
									<div className="flex items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={handleTestConnection}
											disabled={testingConn}
											className="gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
										>
											<ShieldCheck className="h-3.5 w-3.5" />
											<span>{testingConn ? 'Menguji...' : 'Uji Koneksi & Tarik Daftar Board'}</span>
										</Button>

										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={handleResetToDemo}
											className="text-xs text-slate-500 hover:text-slate-800"
										>
											Kembali ke Mode Demo
										</Button>
									</div>

									<div className="flex items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setShowSettings(false)}
											className="text-xs"
										>
											Batal
										</Button>
										<Button
											type="submit"
											variant="default"
											size="sm"
											className="gap-1.5 bg-indigo-600 text-xs text-white hover:bg-indigo-700"
										>
											<Check className="h-3.5 w-3.5" />
											<span>Simpan & Baca Data</span>
										</Button>
									</div>
								</div>
							</form>
						</CardContent>
					</Card>
				)}

				{/* PANDUAN CEPAT MEMAHAMI INTEGRASI MONDAY.COM */}
				{showGuide && (
					<Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 shadow-md dark:border-blue-900/50 dark:from-slate-900 dark:to-slate-900/60">
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Sparkles className="h-4 w-4 text-blue-600" />
									<CardTitle className="text-base font-bold text-blue-950 dark:text-blue-100">
										Panduan Membaca Data Monday.com & Koding GraphQL
									</CardTitle>
								</div>
								<Button
									variant="ghost"
									size="xs"
									onClick={() => setShowGuide(false)}
									className="text-slate-400 hover:text-slate-700"
								>
									✕
								</Button>
							</div>
							<CardDescription className="text-xs text-slate-600 dark:text-slate-400">
								Aplikasi ini membaca data langsung dari board Monday.com Anda via GraphQL API v2.
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<div className="rounded-lg border border-blue-100 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
										1
									</div>
									<h4 className="mt-2 font-semibold text-slate-900 dark:text-white">Ambil API Token</h4>
									<p className="mt-1 text-slate-500">
										Buka Monday.com &gt; Avatar Foto Profil &gt; <strong>Developers</strong> &gt; <strong>My Access Tokens</strong>. Salin token tersebut.
									</p>
								</div>

								<div className="rounded-lg border border-blue-100 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
										2
									</div>
									<h4 className="mt-2 font-semibold text-slate-900 dark:text-white">Pilih Board Kerja</h4>
									<p className="mt-1 text-slate-500">
										Masukkan token di <strong>Koneksi Monday</strong>, sistem akan otomatis membaca semua board akun Anda. Anda tinggal memilihnya dari dropdown!
									</p>
								</div>

								<div className="rounded-lg border border-blue-100 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
										3
									</div>
									<h4 className="mt-2 font-semibold text-slate-900 dark:text-white">Sinkronisasi GraphQL</h4>
									<p className="mt-1 text-slate-500">
										Setiap item task ditampilkan di kolom To Do, Working, dan Done. Klik status untuk mengubahnya secara live ke Monday.com.
									</p>
								</div>
							</div>

							<div className="rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-[11px] text-slate-200 dark:border-slate-800">
								<p className="text-slate-400">Format GraphQL Query yang dijalankan ke api.monday.com/v2:</p>
								<p className="text-emerald-400">query GetBoardItems($boardId: [ID!]) &#123;</p>
								<p className="pl-4 text-sky-300">
									boards(ids: $boardId) &#123; name items_page &#123; items &#123; id name column_values &#123; id text &#125; &#125; &#125;
								</p>
								<p className="text-emerald-400">&#125;</p>
							</div>
						</CardContent>
					</Card>
				)}

				{/* RINGKASAN METRIK (SUMMARY CARDS) */}
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
					<Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
						<CardContent className="p-4 sm:p-5">
							<div className="flex items-center justify-between">
								<span className="text-xs font-medium text-slate-500">Total Task</span>
								<ListTodo className="h-4 w-4 text-slate-400" />
							</div>
							<div className="mt-2 flex items-baseline gap-2">
								<span className="text-2xl font-bold text-slate-900 dark:text-white">{tasks.length}</span>
								<span className="text-xs text-slate-400">task di papan</span>
							</div>
						</CardContent>
					</Card>

					<Card className="border-sky-200/80 bg-sky-50/40 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/20">
						<CardContent className="p-4 sm:p-5">
							<div className="flex items-center justify-between">
								<span className="text-xs font-medium text-sky-700 dark:text-sky-300">To Do</span>
								<div className="h-2 w-2 rounded-full bg-sky-500" />
							</div>
							<div className="mt-2 flex items-baseline gap-2">
								<span className="text-2xl font-bold text-sky-900 dark:text-sky-100">{todoTasks.length}</span>
								<span className="text-xs text-sky-600/70 dark:text-sky-400">belum dimulai</span>
							</div>
						</CardContent>
					</Card>

					<Card className="border-amber-200/80 bg-amber-50/40 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
						<CardContent className="p-4 sm:p-5">
							<div className="flex items-center justify-between">
								<span className="text-xs font-medium text-amber-700 dark:text-amber-300">Working on it</span>
								<Clock className="h-4 w-4 text-amber-500" />
							</div>
							<div className="mt-2 flex items-baseline gap-2">
								<span className="text-2xl font-bold text-amber-900 dark:text-amber-100">{workingTasks.length}</span>
								<span className="text-xs text-amber-600/70 dark:text-amber-400">sedang berjalan</span>
							</div>
						</CardContent>
					</Card>

					<Card className="border-emerald-200/80 bg-emerald-50/40 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
						<CardContent className="p-4 sm:p-5">
							<div className="flex items-center justify-between">
								<span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Done</span>
								<CheckCircle2 className="h-4 w-4 text-emerald-500" />
							</div>
							<div className="mt-2 flex items-baseline gap-2">
								<span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{doneTasks.length}</span>
								<span className="text-xs text-emerald-600/70 dark:text-emerald-400">{percentDone}% selesai</span>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* FORM TAMBAH TASK CEPAT */}
				<Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
					<CardContent className="p-4 sm:p-5">
						<form onSubmit={handleCreateTask} className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<div className="relative flex-1">
								<Input
									placeholder="Tambah task baru... (misal: Selesaikan presentasi tim)"
									value={newTaskTitle}
									onChange={(e) => setNewTaskTitle(e.target.value)}
									className="text-sm"
								/>
							</div>

							<div className="flex items-center gap-2">
								{/* Pilih Prioritas */}
								<select
									value={newTaskPriority}
									onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
									className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
								>
									<option value="low">Prioritas: Rendah</option>
									<option value="medium">Prioritas: Sedang</option>
									<option value="high">Prioritas: Tinggi</option>
								</select>

								{/* Pilih Status Awal */}
								<select
									value={newTaskStatus}
									onChange={(e) => setNewTaskStatus(e.target.value as TaskStatus)}
									className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
								>
									<option value="todo">Status: To Do</option>
									<option value="working">Status: Working on it</option>
									<option value="done">Status: Done</option>
								</select>

								<Button
									type="submit"
									disabled={creatingTask || !newTaskTitle.trim()}
									className="gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700 shrink-0"
								>
									<Plus className="h-3.5 w-3.5" />
									<span>{creatingTask ? 'Menyimpan...' : 'Tambah Task'}</span>
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

				{/* HEADER LIST, PEMILIH BOARD & TOGGLE TAMPILAN */}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap items-center gap-3">
						<div>
							<h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
								{boardInfo.name}
							</h2>
							<p className="text-xs text-slate-500">
								{isLive
									? `Board ID: ${boardInfo.id || '-'}`
									: 'Mode Simulasi Lokal — Masukkan API Key untuk membaca board akun Monday.com Anda'}
							</p>
						</div>

						{/* Dropdown cepat ganti board jika akun punya beberapa board */}
						{availableBoards.length > 1 && (
							<div className="relative inline-block">
								<select
									value={boardId}
									onChange={(e) => handleSwitchBoard(e.target.value)}
									className="h-7 rounded-md border border-slate-200 bg-white pl-2 pr-7 text-xs font-medium text-slate-700 shadow-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
								>
									{availableBoards.map((b) => (
										<option key={b.id} value={b.id}>
											{b.name}
										</option>
									))}
								</select>
								<ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-slate-400" />
							</div>
						)}
					</div>

					<div className="flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:self-auto dark:border-slate-800 dark:bg-slate-900">
						<button
							onClick={() => setViewMode('kanban')}
							className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
								viewMode === 'kanban'
									? 'bg-blue-600 text-white'
									: 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
							}`}
						>
							<LayoutGrid className="h-3.5 w-3.5" />
							<span>Kanban Kolom</span>
						</button>
						<button
							onClick={() => setViewMode('list')}
							className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
								viewMode === 'list'
									? 'bg-blue-600 text-white'
									: 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
							}`}
						>
							<List className="h-3.5 w-3.5" />
							<span>Daftar List</span>
						</button>
					</div>
				</div>

				{/* TAMPILAN LOADING */}
				{loading && (
					<div className="flex flex-col items-center justify-center py-16 text-slate-400">
						<RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
						<p className="mt-3 text-sm">Membaca data dari Monday.com via GraphQL...</p>
					</div>
				)}

				{/* TAMPILAN KANBAN (KOLOM STATUS) */}
				{!loading && viewMode === 'kanban' && (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{/* Kolom TO DO */}
						<div className="flex flex-col rounded-xl border border-sky-100 bg-sky-50/30 p-3 dark:border-sky-950 dark:bg-sky-950/10">
							<div className="mb-3 flex items-center justify-between border-b border-sky-100 pb-2.5 dark:border-sky-900/40">
								<div className="flex items-center gap-2">
									<div className="h-2.5 w-2.5 rounded-full bg-sky-500" />
									<h3 className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-200">
										To Do
									</h3>
								</div>
								<span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-900 dark:text-sky-300">
									{todoTasks.length}
								</span>
							</div>

							<div className="space-y-2.5 flex-1">
								{todoTasks.map((task) => (
									<TaskCard
										key={task.id}
										task={task}
										onCycleStatus={handleCycleStatus}
										onDelete={handleDeleteTask}
									/>
								))}
								{todoTasks.length === 0 && (
									<div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-sky-200 text-xs text-sky-600/60 dark:border-sky-900/50">
										Tidak ada task to do
									</div>
								)}
							</div>
						</div>

						{/* Kolom WORKING ON IT */}
						<div className="flex flex-col rounded-xl border border-amber-100 bg-amber-50/30 p-3 dark:border-amber-950 dark:bg-amber-950/10">
							<div className="mb-3 flex items-center justify-between border-b border-amber-100 pb-2.5 dark:border-amber-900/40">
								<div className="flex items-center gap-2">
									<Clock className="h-3.5 w-3.5 text-amber-500" />
									<h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
										Working on it
									</h3>
								</div>
								<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
									{workingTasks.length}
								</span>
							</div>

							<div className="space-y-2.5 flex-1">
								{workingTasks.map((task) => (
									<TaskCard
										key={task.id}
										task={task}
										onCycleStatus={handleCycleStatus}
										onDelete={handleDeleteTask}
									/>
								))}
								{workingTasks.length === 0 && (
									<div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-amber-200 text-xs text-amber-600/60 dark:border-amber-900/50">
										Tidak ada task sedang berjalan
									</div>
								)}
							</div>
						</div>

						{/* Kolom DONE */}
						<div className="flex flex-col rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 dark:border-emerald-950 dark:bg-emerald-950/10">
							<div className="mb-3 flex items-center justify-between border-b border-emerald-100 pb-2.5 dark:border-emerald-900/40">
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
									<h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
										Done
									</h3>
								</div>
								<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
									{doneTasks.length}
								</span>
							</div>

							<div className="space-y-2.5 flex-1">
								{doneTasks.map((task) => (
									<TaskCard
										key={task.id}
										task={task}
										onCycleStatus={handleCycleStatus}
										onDelete={handleDeleteTask}
									/>
								))}
								{doneTasks.length === 0 && (
									<div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-emerald-200 text-xs text-emerald-600/60 dark:border-emerald-900/50">
										Belum ada task selesai
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* TAMPILAN LIST (DAFTAR TABEL) */}
				{!loading && viewMode === 'list' && (
					<Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
						<CardContent className="p-0">
							<div className="divide-y divide-slate-100 dark:divide-slate-800">
								{tasks.map((task) => {
									const statusMeta = STATUS_LABELS[task.status];
									return (
										<div
											key={task.id}
											className="flex flex-col items-start justify-between gap-3 p-4 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center dark:hover:bg-slate-800/40"
										>
											<div className="flex items-center gap-3">
												<button
													onClick={() => handleCycleStatus(task)}
													title="Klik untuk mengubah status"
													className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
														task.status === 'done'
															? 'border-emerald-500 bg-emerald-500 text-white'
															: 'border-slate-300 hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700'
													}`}
												>
													{task.status === 'done' && <Check className="h-3.5 w-3.5" />}
												</button>

												<div>
													<p
														className={`text-sm font-medium ${
															task.status === 'done'
																? 'line-through text-slate-400 dark:text-slate-500'
																: 'text-slate-900 dark:text-slate-100'
														}`}
													>
														{task.title}
													</p>
													<div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
														<span>ID: #{task.mondayId || task.id}</span>
														{task.priority && (
															<span
																className={`rounded px-1.5 py-0.2 font-medium ${
																	task.priority === 'high'
																		? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
																		: task.priority === 'low'
																		? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
																		: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
																}`}
															>
																{task.priority.toUpperCase()}
															</span>
														)}
													</div>
												</div>
											</div>

											<div className="flex items-center gap-2 self-end sm:self-auto">
												<button
													onClick={() => handleCycleStatus(task)}
													className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${statusMeta.bg} ${statusMeta.color}`}
													title="Klik untuk geser status"
												>
													{statusMeta.label}
												</button>

												<Button
													variant="ghost"
													size="icon-xs"
													onClick={() => handleDeleteTask(task)}
													className="text-slate-400 hover:text-rose-600"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
									);
								})}

								{tasks.length === 0 && (
									<div className="p-8 text-center text-xs text-slate-400">
										Belum ada task di board ini. Tambahkan task baru di atas.
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* FOOTER INFO EDUKASI */}
				<footer className="mt-12 rounded-xl border border-slate-200/60 bg-white/60 p-4 text-center text-xs text-slate-500 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
					<p>
						💡 <strong>Tips FlowBoard GraphQL:</strong> Semua query dan mutasi dikirim langsung ke{' '}
						<code className="rounded bg-slate-100 px-1 py-0.5 text-blue-600 dark:bg-slate-800 dark:text-blue-300">
							https://api.monday.com/v2
						</code>
						. Buka tab <strong>GraphQL Explorer</strong> di navbar atas untuk menguji query GraphQL secara live!
					</p>
				</footer>
			</div>
		</main>
	);
}

/**
 * Komponen Card Task untuk Tampilan Kanban
 */
function TaskCard({
	task,
	onCycleStatus,
	onDelete,
}: {
	task: Task;
	onCycleStatus: (task: Task) => void;
	onDelete: (task: Task) => void;
}) {
	const statusMeta = STATUS_LABELS[task.status];

	return (
		<div className="group relative rounded-lg border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
			<div className="flex items-start justify-between gap-2">
				<p
					className={`text-xs font-medium leading-relaxed ${
						task.status === 'done'
							? 'line-through text-slate-400 dark:text-slate-500'
							: 'text-slate-900 dark:text-slate-100'
					}`}
				>
					{task.title}
				</p>

				<button
					onClick={() => onDelete(task)}
					title="Hapus task"
					className="text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100 dark:text-slate-600"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</button>
			</div>

			<div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
				<div className="flex items-center gap-1.5">
					{task.priority && (
						<span
							className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
								task.priority === 'high'
									? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
									: task.priority === 'low'
									? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
									: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
							}`}
						>
							{task.priority.toUpperCase()}
						</span>
					)}
					<span className="text-[10px] text-slate-400">#{task.mondayId || task.id}</span>
				</div>

				{/* Tombol Geser Status 1-Klik */}
				<button
					onClick={() => onCycleStatus(task)}
					title="Klik untuk memindahkan status ke tahap berikutnya"
					className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all ${statusMeta.bg} ${statusMeta.color}`}
				>
					<span>{statusMeta.label}</span>
					<ArrowRight className="h-2.5 w-2.5 opacity-60" />
				</button>
			</div>
		</div>
	);
}
