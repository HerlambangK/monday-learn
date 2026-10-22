/**
 * ============================================================================
 * DEFINISI GRAPHQL QUERY & MUTATION UNTUK MONDAY.COM API v2
 * ============================================================================
 * 
 * Monday.com menggunakan GraphQL sebagai protokol API resminya.
 * Semua permintaan dikirim menggunakan HTTP POST ke: https://api.monday.com/v2
 * dengan Header:
 *   - Authorization: <PERSONAL_API_TOKEN>
 *   - Content-Type: application/json
 *   - API-Version: 2024-01
 */

/**
 * 1. QUERY: Uji Koneksi Akun & Info Profil Pengguna
 * Mengambil nama, email, dan id akun dari token yang sedang aktif.
 */
export const QUERY_ME = `
query GetCurrentUser {
  me {
    id
    name
    email
    title
  }
}
`;

/**
 * 2. QUERY: Mengambil Daftar Semua Board Milik Pengguna
 * Mengambil 25 board aktif untuk dipilih oleh pengguna.
 */
export const QUERY_LIST_BOARDS = `
query ListUserBoards {
  boards(limit: 25, state: active) {
    id
    name
    description
    state
    type
  }
}
`;

/**
 * 3. QUERY: Mengambil Data Board & Seluruh Task/Item di Dalamnya
 * Mengambil kolom (status, priority) dan 50 item teratas beserta nilai kolomnya.
 */
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
      cursor
      items {
        id
        name
        state
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

/**
 * 4. MUTATION: Membuat Task/Item Baru di Board Monday.com
 * Mendaftarkan item baru dengan nama yang diberikan ke dalam board_id tertentu.
 */
export const MUTATION_CREATE_ITEM = `
mutation CreateTaskItem($boardId: ID!, $itemName: String!) {
  create_item(board_id: $boardId, item_name: $itemName) {
    id
    name
  }
}
`;

/**
 * 5. MUTATION: Mengubah Nilai Kolom Status Task
 * Memperbarui label status item (misal: "Working on it" atau "Done") pada column_id status.
 */
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

/**
 * 6. MUTATION: Menghapus Task/Item dari Board Monday.com
 */
export const MUTATION_DELETE_ITEM = `
mutation DeleteTaskItem($itemId: ID!) {
  delete_item(item_id: $itemId) {
    id
  }
}
`;

/**
 * Daftar preset query untuk GraphQL Explorer di UI
 */
export const GRAPHQL_PRESETS = [
	{
		name: '1. Cek Profil Akun (me)',
		query: QUERY_ME,
		description: 'Memeriksa token dan mengambil nama serta email akun Monday.com Anda.',
		variables: {},
	},
	{
		name: '2. Daftar Papan Kerja (boards)',
		query: QUERY_LIST_BOARDS,
		description: 'Menampilkan daftar seluruh board aktif yang Anda miliki di Monday.com.',
		variables: {},
	},
	{
		name: '3. Baca Item Board (items_page)',
		query: QUERY_GET_BOARD_ITEMS,
		description: 'Membaca seluruh item task dan kolom status di board yang dipilih.',
		variables: { boardId: ['REPLACE_WITH_YOUR_BOARD_ID'] },
	},
	{
		name: '4. Buat Task Baru (create_item)',
		query: MUTATION_CREATE_ITEM,
		description: 'Menambahkan baris task baru langsung ke board Monday.com.',
		variables: { boardId: 'REPLACE_WITH_YOUR_BOARD_ID', itemName: 'Task Baru dari FlowBoard' },
	},
];

