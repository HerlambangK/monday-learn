# 📖 GUIDEBOOK: Membangun FlowBoard dari Nol (Monday.com GraphQL API + Next.js)

Selamat datang di **Guidebook Pembuatan Aplikasi FlowBoard** dari awal (*from scratch*) sampai menjadi aplikasi manajemen task yang terintegrasi penuh secara live dengan **Monday.com GraphQL API v2** seperti yang telah selesai kita buat!

---

## 📑 Daftar Isi
1. [Target Hasil Akhir Aplikasi](#1-target-hasil-akhir-aplikasi)
2. [Prasyarat & Konsep Kunci](#2-prasyarat--konsep-kunci)
3. [Langkah 1: Inisialisasi Project Next.js & Dependensi](#langkah-1-inisialisasi-project-nextjs--dependensi)
4. [Langkah 2: Menyiapkan Kredensial Monday.com & Variabel Lingkungan](#langkah-2-menyiapkan-kredensial-mondaycom--variabel-lingkungan)
5. [Langkah 3: Menentukan Tipe Data Task (`lib/task.ts`)](#langkah-3-menentukan-tipe-data-task-libtaskts)
6. [Langkah 4: Menulis Pustaka GraphQL Query & Mutation (`lib/graphql.ts`)](#langkah-4-menulis-pustaka-graphql-query--mutation-libgraphqlts)
7. [Langkah 5: Membuat Client Helper Monday.com (`lib/monday.ts`)](#langkah-5-membuat-client-helper-mondaycom-libmondayts)
8. [Langkah 6: Membangun Backend API Route Next.js (`app/api/monday/route.ts`)](#langkah-6-membangun-backend-api-route-nextjs-appapimondayroutets)
9. [Langkah 7: Konfigurasi Styling, Font & Warna Monday (`app/globals.css` & `app/layout.tsx`)](#langkah-7-konfigurasi-styling-font--warna-monday-appglobalscss--applayouttsx)
10. [Langkah 8: Menyiapkan Komponen UI (`components/ui/`)](#langkah-8-menyiapkan-komponen-ui-componentsui)
11. [Langkah 9: Membangun Halaman Utama & GraphQL Explorer (`app/page.tsx`)](#langkah-9-membangun-halaman-utama--graphql-explorer-apppagetsx)
12. [Langkah 10: Menjalankan & Menguji Aplikasi Secara Live](#langkah-10-menjalankan--menguji-aplikasi-secara-live)
13. [Troubleshooting & FAQ](#13-troubleshooting--faq)

---

## 1. Target Hasil Akhir Aplikasi

Aplikasi akhir yang kita bangun memiliki kemampuan:
* 🟢 **Live Sync Monday.com**: Membaca otomatis board dan task akun Monday.com Anda via GraphQL API v2.
* 📊 **Ringkasan Metrik**: Kartu hitung jumlah Total Task, To Do, Working on it, dan Done dengan progress bar penyelesaian.
* 📋 **Tampilan Ganda**: Bisa beralih antara mode **Papan Kanban Kolom** dan mode **Daftar (List)**.
* ⚡ **Ubah Status 1-Klik**: Klik badge status pada kartu (*To Do* ➔ *Working on it* ➔ *Done*), langsung tersinkronisasi ke Monday.com secara real-time (*Optimistic UI*).
* ➕ **Tambah & Hapus Task**: Form pembuatan task baru yang langsung mendaftarkan baris item di board Monday.com Anda.
* 🛠️ **GraphQL Explorer Interaktif**: Playground untuk menginspeksi dan mengeksekusi query GraphQL langsung ke endpoint `https://api.monday.com/v2` serta melihat JSON responnya.

---

## 2. Prasyarat & Konsep Kunci

### A. Mengapa Monday.com Menggunakan GraphQL?
Monday.com menggunakan **GraphQL API v2** yang beralamat di:
```
POST https://api.monday.com/v2
```
* **Endpoint Tunggal**: Semua operasi (baca, tambah, ubah, hapus) dikirim ke satu URL yang sama dengan metode **HTTP POST**.
* **Header Wajib**:
  ```http
  Authorization: <PERSONAL_API_TOKEN>
  Content-Type: application/json
  API-Version: 2024-01
  ```
* **Payload JSON**:
  ```json
  {
    "query": "query { me { id name email } }",
    "variables": {}
  }
  ```

---

## Langkah 1: Inisialisasi Project Next.js & Dependensi

1. Buat project baru Next.js dengan TypeScript, Tailwind CSS, dan App Router:
   ```bash
   npx create-next-app@latest monday-app --typescript --tailwind --eslint --app --src-dir=false
   cd monday-app
   ```

2. Pasang library pendukung (Lucide Icons, Base UI, dan Utilitas ClassName):
   ```bash
   npm install lucide-react class-variance-authority @base-ui/react cn
   ```

3. Buat helper utilitas `lib/utils.ts`:
   ```typescript
   // lib/utils.ts
   export { cn } from 'cn';
   ```

---

## Langkah 2: Menyiapkan Kredensial Monday.com & Variabel Lingkungan

### A. Cara Mengambil Personal API Token:
1. Buka akun Anda di [Monday.com](https://monday.com).
2. Klik **Avatar Profil** di pojok kiri bawah.
3. Pilih **Developers** > tab **My Access Tokens**.
4. Klik **Show** lalu **Copy** token Anda.

### B. Menemukan Board ID:
Buka board kerja Anda di browser, perhatikan URL address:
`https://workspace.monday.com/boards/5031976216` ➔ Board ID adalah `5031976216`.

### C. Simpan di File `.env.local`:
Buat file `.env.local` di root folder project:
```env
# .env.local
MONDAY_API_KEY=eyJhbGciOiJIUzI1NiJ9...
MONDAY_BOARD_ID=5031976216
```

Buat juga file `.env.example` sebagai referensi publik:
```env
# .env.example
MONDAY_API_KEY=your_monday_personal_token_here
MONDAY_BOARD_ID=your_board_id_here
```

Pastikan `.env.local` ada di `.gitignore`:
```gitignore
.env*
!.env.example
```

---

## Langkah 3: Menentukan Tipe Data Task (`lib/task.ts`)

Buat file `lib/task.ts` untuk mendefinisikan model task dan pemetaan warna khas Monday.com:

```typescript
// lib/task.ts
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

// Warna khas Monday.com
export const STATUS_LABELS: Record<TaskStatus, { label: string; color: string; bg: string; dot: string }> = {
  todo: {
    label: 'To Do',
    color: 'text-white font-medium',
    bg: 'bg-[#579bfc] hover:bg-[#4388e8] shadow-xs active:scale-95',
    dot: 'bg-[#579bfc]',
  },
  working: {
    label: 'Working on it',
    color: 'text-white font-medium',
    bg: 'bg-[#fdab3d] hover:bg-[#e99a2c] shadow-xs active:scale-95',
    dot: 'bg-[#fdab3d]',
  },
  done: {
    label: 'Done',
    color: 'text-white font-medium',
    bg: 'bg-[#00c875] hover:bg-[#00b268] shadow-xs active:scale-95',
    dot: 'bg-[#00c875]',
  },
};

// Fungsi normalisasi dari teks label kolom Monday.com ke TaskStatus
export function normalizeMondayStatus(label?: string | null): TaskStatus {
  if (!label) return 'todo';
  const clean = label.toLowerCase().trim();
  if (clean.includes('done') || clean.includes('selesai')) return 'done';
  if (clean.includes('work') || clean.includes('progress') || clean.includes('sedang')) return 'working';
  return 'todo';
}

// Mengembalikan label status resmi Monday.com
export function toMondayStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'done': return 'Done';
    case 'working': return 'Working on it';
    default: return 'To Do';
  }
}
```

---

## Langkah 4: Menulis Pustaka GraphQL Query & Mutation (`lib/graphql.ts`)

Buat file `lib/graphql.ts` untuk mengumpulkan seluruh query dan mutasi GraphQL secara terstruktur:

```typescript
// lib/graphql.ts

// 1. Query cek user aktif
export const QUERY_ME = `
query GetCurrentUser {
  me {
    id
    name
    email
  }
}
`;

// 2. Query daftar board milik akun
export const QUERY_LIST_BOARDS = `
query ListUserBoards {
  boards(limit: 25, state: active) {
    id
    name
    description
  }
}
`;

// 3. Query membaca data board & item
export const QUERY_GET_BOARD_ITEMS = `
query GetBoardItems($boardId: [ID!]) {
  boards(ids: $boardId) {
    id
    name
    description
    columns {
      id
      title
      type
    }
    items_page(limit: 50) {
      items {
        id
        name
        column_values {
          id
          type
          text
          value
        }
      }
    }
  }
}
`;

// 4. Mutasi membuat task baru
export const MUTATION_CREATE_ITEM = `
mutation CreateTaskItem($boardId: ID!, $itemName: String!) {
  create_item(board_id: $boardId, item_name: $itemName) {
    id
    name
  }
}
`;

// 5. Mutasi mengubah nilai status
export const MUTATION_UPDATE_STATUS = `
mutation UpdateTaskStatus($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
  change_simple_column_value(
    board_id: $boardId,
    item_id: $itemId,
    column_id: $columnId,
    value: $value
  ) {
    id
  }
}
`;

// 6. Mutasi menghapus item
export const MUTATION_DELETE_ITEM = `
mutation DeleteTaskItem($itemId: ID!) {
  delete_item(item_id: $itemId) {
    id
  }
}
`;

// Preset untuk GraphQL Explorer di UI
export const GRAPHQL_PRESETS = [
  {
    name: '1. Cek Profil Akun (me)',
    query: QUERY_ME,
    variables: {},
  },
  {
    name: '2. Daftar Papan Kerja (boards)',
    query: QUERY_LIST_BOARDS,
    variables: {},
  },
  {
    name: '3. Baca Item Board (items_page)',
    query: QUERY_GET_BOARD_ITEMS,
    variables: { boardId: ['5031976216'] },
  },
  {
    name: '4. Buat Task Baru (create_item)',
    query: MUTATION_CREATE_ITEM,
    variables: { boardId: '5031976216', itemName: 'Task Baru' },
  },
];
```

---

## Langkah 5: Membuat Client Helper Monday.com (`lib/monday.ts`)

File `lib/monday.ts` bertindak sebagai penghubung logika antara GraphQL dan aplikasi Next.js:

```typescript
// lib/monday.ts
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

// 1. Fungsi Umum Eksekutor GraphQL
export async function executeMondayGraphQL<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  apiKey?: string
): Promise<T> {
  const token = apiKey || process.env.MONDAY_API_KEY;
  if (!token) throw new Error('API Key Monday.com belum disetel.');

  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors.map((e: any) => e.message).join(', '));
  }

  return result.data as T;
}

// 2. Fungsi Tes Koneksi
export async function testMondayConnection(apiKey?: string) {
  const data = await executeMondayGraphQL<{ me: { id: string; name: string; email: string } }>(
    QUERY_ME,
    {},
    apiKey
  );
  return data.me;
}

// 3. Fungsi Ambil Daftar Board
export async function fetchUserBoards(apiKey?: string) {
  const data = await executeMondayGraphQL<{
    boards: Array<{ id: string; name: string; description?: string }>;
  }>(QUERY_LIST_BOARDS, {}, apiKey);
  return data.boards || [];
}

// 4. Fungsi Ambil Data Board & Item
export async function fetchMondayBoard(boardId: string, apiKey?: string) {
  const data = await executeMondayGraphQL<{ boards: any[] }>(
    QUERY_GET_BOARD_ITEMS,
    { boardId: [boardId] },
    apiKey
  );

  const board = data.boards?.[0];
  if (!board) throw new Error(`Board ID "${boardId}" tidak ditemukan.`);

  // Cari kolom status secara dinamis
  const statusColumn = board.columns.find(
    (col: any) => col.type === 'status' || col.id === 'status' || col.title.toLowerCase().includes('status')
  );

  const tasks: Task[] = board.items_page.items.map((item: any) => {
    const statusVal = item.column_values.find((c: any) => c.id === statusColumn?.id || c.type === 'status');
    const priorityVal = item.column_values.find((c: any) => c.title?.toLowerCase().includes('priority'));

    return {
      id: item.id,
      title: item.name,
      status: normalizeMondayStatus(statusVal?.text),
      priority: priorityVal?.text?.toLowerCase() || 'medium',
      mondayId: item.id,
    };
  });

  return {
    board: {
      id: board.id,
      name: board.name,
      statusColumnId: statusColumn?.id || 'status',
    },
    tasks,
  };
}

// 5. Fungsi Buat Item Task
export async function createMondayItem(
  boardId: string,
  itemName: string,
  status: TaskStatus = 'todo',
  priority: TaskPriority = 'medium',
  statusColumnId: string = 'status',
  apiKey?: string
) {
  const data = await executeMondayGraphQL<{ create_item: { id: string; name: string } }>(
    MUTATION_CREATE_ITEM,
    { boardId, itemName },
    apiKey
  );

  const newItem = data.create_item;

  // Set nilai status awal jika ada
  try {
    await executeMondayGraphQL(
      MUTATION_UPDATE_STATUS,
      {
        boardId,
        itemId: newItem.id,
        columnId: statusColumnId,
        value: toMondayStatusLabel(status),
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

// 6. Fungsi Ubah Status
export async function updateMondayItemStatus(
  boardId: string,
  itemId: string,
  status: TaskStatus,
  statusColumnId: string = 'status',
  apiKey?: string
) {
  return await executeMondayGraphQL(
    MUTATION_UPDATE_STATUS,
    {
      boardId,
      itemId,
      columnId: statusColumnId,
      value: toMondayStatusLabel(status),
    },
    apiKey
  );
}

// 7. Fungsi Hapus Item
export async function deleteMondayItem(itemId: string, apiKey?: string) {
  return await executeMondayGraphQL(MUTATION_DELETE_ITEM, { itemId }, apiKey);
}
```

---

## Langkah 6: Membangun Backend API Route Next.js (`app/api/monday/route.ts`)

File API Route ini menghubungkan browser klien dengan Monday.com secara aman:

```typescript
// app/api/monday/route.ts
import { NextResponse } from 'next/server';
import {
  fetchMondayBoard,
  fetchUserBoards,
  testMondayConnection,
  createMondayItem,
  updateMondayItemStatus,
  deleteMondayItem,
  executeMondayGraphQL,
} from '@/lib/monday';

// GET: Membaca board dan tasks
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get('apiKey') || process.env.MONDAY_API_KEY;
  const boardIdParam = searchParams.get('boardId') || process.env.MONDAY_BOARD_ID;
  const action = searchParams.get('action');

  if (action === 'boards') {
    const boards = await fetchUserBoards(apiKey);
    return NextResponse.json({ success: true, boards });
  }

  if (!apiKey) {
    return NextResponse.json({ isLive: false, message: 'Mode Demo' });
  }

  let activeBoardId = boardIdParam;
  const userBoards = await fetchUserBoards(apiKey);
  if (!activeBoardId && userBoards.length > 0) {
    activeBoardId = userBoards[0].id;
  }

  const result = await fetchMondayBoard(activeBoardId!, apiKey);
  return NextResponse.json({
    isLive: true,
    availableBoards: userBoards,
    ...result,
  });
}

// POST: Membuat task, uji koneksi, atau jalankan custom GraphQL
export async function POST(request: Request) {
  const body = await request.json();
  const { action, apiKey: clientKey, boardId: clientBoardId } = body;
  const apiKey = clientKey || process.env.MONDAY_API_KEY;
  const boardId = clientBoardId || process.env.MONDAY_BOARD_ID;

  if (action === 'test') {
    const user = await testMondayConnection(apiKey);
    return NextResponse.json({ success: true, message: `Terhubung sebagai ${user.name}`, user });
  }

  if (action === 'create') {
    const { title, status = 'todo', priority = 'medium', statusColumnId = 'status' } = body;
    const newTask = await createMondayItem(boardId, title, status, priority, statusColumnId, apiKey);
    return NextResponse.json({ success: true, task: newTask });
  }

  if (action === 'run_graphql') {
    const { query, variables = {} } = body;
    const result = await executeMondayGraphQL(query, variables, apiKey);
    return NextResponse.json({ success: true, data: result });
  }

  return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
}

// PATCH: Ubah status task
export async function PATCH(request: Request) {
  const body = await request.json();
  const { itemId, status, statusColumnId = 'status', apiKey: clientKey, boardId: clientBoardId } = body;
  const apiKey = clientKey || process.env.MONDAY_API_KEY;
  const boardId = clientBoardId || process.env.MONDAY_BOARD_ID;

  await updateMondayItemStatus(boardId, itemId, status, statusColumnId, apiKey);
  return NextResponse.json({ success: true });
}

// DELETE: Hapus task
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId')!;
  const apiKey = searchParams.get('apiKey') || process.env.MONDAY_API_KEY;

  await deleteMondayItem(itemId, apiKey);
  return NextResponse.json({ success: true });
}
```

---

## Langkah 7: Konfigurasi Styling, Font & Warna Monday (`app/globals.css` & `app/layout.tsx`)

### A. Font Google Geist di `app/layout.tsx`:
```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowBoard — Monday.com Task Manager",
  description: "Modern task management integrated with Monday.com GraphQL API v2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
```

### B. Palet Warna & Utility di `app/globals.css`:
```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), monospace;
  --color-primary: var(--primary);
  --color-card: var(--card);
  --color-border: var(--border);
  --radius: 0.75rem;
}

:root {
  --background: oklch(0.985 0.005 240);
  --foreground: oklch(0.18 0.02 250);
  --card: oklch(1 0 0);
  --primary: oklch(0.55 0.22 255); /* Monday Blue: #0073ea */
  --border: oklch(0.90 0.01 240);
  --input: oklch(0.88 0.015 240);
  --ring: oklch(0.55 0.22 255);
}
```

---

## Langkah 8: Menyiapkan Komponen UI (`components/ui/`)

Pastikan komponen dasar Card, Button, Input, dan Badge telah terpasang dengan rapi:
* [`components/ui/card.tsx`](file:///Users/herlambangk/FileKu/Bermain/monday/monday-app/components/ui/card.tsx) (menggunakan `rounded-2xl border border-border/80 shadow-xs`)
* [`components/ui/button.tsx`](file:///Users/herlambangk/FileKu/Bermain/monday/monday-app/components/ui/button.tsx) (menggunakan ukuran `h-9` dan `h-10` dengan hover shadow)
* [`components/ui/input.tsx`](file:///Users/herlambangk/FileKu/Bermain/monday/monday-app/components/ui/input.tsx) (tinggi `h-9` dengan focus ring lembut)
* [`components/ui/badge.tsx`](file:///Users/herlambangk/FileKu/Bermain/monday/monday-app/components/ui/badge.tsx) (pills bulat dengan teks proporsional)

---

## Langkah 9: Membangun Halaman Utama & GraphQL Explorer (`app/page.tsx`)

Buka file [`app/page.tsx`](file:///Users/herlambangk/FileKu/Bermain/monday/monday-app/app/page.tsx). File ini menggabungkan seluruh fitur:
1. **Panggilan Asinkron**: Mengambil data board saat komponen dimuat.
2. **Optimistic UI Updates**: Status berpindah seketika di layar saat diklik (*To Do* ➔ *Working on it* ➔ *Done*), lalu melakukan mutasi GraphQL di background.
3. **GraphQL Explorer Drawer**: Panel uji query real-time dengan pilihan preset query, input variabel JSON, dan kotak hasil JSON response.

---

## Langkah 10: Menjalankan & Menguji Aplikasi Secara Live

1. **Jalankan development server**:
   ```bash
   npm run dev
   ```
2. **Akses di Browser**:
   Buka **`http://localhost:3000`**.
3. **Hasil yang Terlihat**:
   - Status **🟢 Live** menampilkan nama board Anda: **"My first project"**.
   - Menampilkan ketiga task asli Anda:
     1. **Belajar Fundamental** (*Working on it*, High)
     2. **Task 2** (*Done*)
     3. **Task 3** (*Done*)
   - Mengklik status langsung mengubah nilai kolom `project_status` di Monday.com!
   - Membuka tab **GraphQL Explorer** menampilkan kode query yang dikirimkan ke server.

---

## 13. Troubleshooting & FAQ

#### 1. Mengapa Query Mengembalikan `Not Authenticated`?
Pastikan Personal API Token tidak terpotong saat disalin dan header `Authorization` dikirim tanpa kata "Bearer" jika menggunakan API v2 Monday.

#### 2. Mengapa Status Tidak Berubah di Board?
Setiap board Monday.com memiliki ID kolom status yang berbeda. Pada board default adalah `status`, namun pada template project adalah `project_status`. Kode di `lib/monday.ts` telah menangani hal ini secara dinamis dengan mendeteksi kolom `type === "status"`.

#### 3. Bagaimana Memastikan Token Aman?
Simpan token hanya di `.env.local` atau masukkan melalui form UI di sesi browser lokal. Jangan pernah melakukan `git commit` pada token rahasia ke repositori publik!

---

*Selamat! Anda kini telah menguasai alur penuh integrasi GraphQL Monday.com dari nol hingga siap produksi!* 🚀
