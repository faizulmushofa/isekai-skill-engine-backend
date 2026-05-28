import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TokenTrackerService } from '../token-management/token-tracker.service';
import { DynamicRoutingService } from '../ai/routing/dynamic-routing.service';
import { InfraKeyGuard } from './infra-key.guard';
import { AiTaskType } from '../ai/enums/ai-task-type.enum';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Infra')
@Controller('infra')
export class InfraDashboardController {
  constructor(
    private readonly tokenTracker: TokenTrackerService,
    private readonly dynamicRouting: DynamicRoutingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('blocks')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Get blocked AI users' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async getBlockedUsers() {
    return this.prisma.aiUserBlock.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('blocks')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Block a user from an AI task' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async blockUser(@Body() body: { userName: string; taskType: string; reason?: string }) {
    return this.prisma.aiUserBlock.upsert({
      where: {
        userName_taskType: {
          userName: body.userName,
          taskType: body.taskType,
        },
      },
      update: { reason: body.reason },
      create: {
        userName: body.userName,
        taskType: body.taskType,
        reason: body.reason,
      },
    });
  }

  @Delete('blocks/:id')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async unblockUser(@Param('id') id: string) {
    await this.prisma.aiUserBlock.delete({ where: { id } });
    return { success: true };
  }

  @Get('token-stats')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Get current in-memory token usage and DB history' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async getTokenStats() {
    const memory = this.tokenTracker.getInMemoryStats();
    const history = await this.tokenTracker.getDbStats();
    return { memory, history };
  }

  @Get('routing-config')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Get current AI task routing configs' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  getRoutingConfig() {
    return this.dynamicRouting.getAllRoutes();
  }

  @Post('routing-config')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Update AI task routing config' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async updateRoutingConfig(@Body() body: { taskType: AiTaskType; provider: 'gemini' | 'groq'; model: string; temperature: number; fallbackProvider?: 'gemini' | 'groq'; fallbackModel?: string }) {
    await this.dynamicRouting.updateRouteOverride(body.taskType, body.provider, body.model, body.temperature, body.fallbackProvider, body.fallbackModel);
    return { success: true };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'HTML Dashboard for Infra metrics' })
  getDashboard() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ISEKAI SKILL ENGINE - Infra Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { background-color: #0f172a; color: #f8fafc; font-family: 'Inter', sans-serif; }
      .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; }
      .text-neon { color: #38bdf8; text-shadow: 0 0 10px rgba(56, 189, 248, 0.5); }
      .tab-active { border-bottom: 2px solid #38bdf8; color: #38bdf8; }
      .modal { background-color: rgba(15, 23, 42, 0.9); }
    </style>
</head>
<body class="p-8">
    
    <!-- Login Screen -->
    <div id="login-screen" class="max-w-md mx-auto mt-20 card text-center">
        <h1 class="text-2xl font-bold text-neon mb-6">Infra Dashboard Login</h1>
        <p class="text-sm text-slate-400 mb-4">Silakan masukkan Secret Key untuk mengakses dasbor infrastruktur.</p>
        <input type="password" id="secret-key" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 mb-4 text-white focus:outline-none focus:border-sky-500" placeholder="Enter Secret Key..." />
        <button onclick="login()" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Masuk
        </button>
        <p id="login-error" class="text-red-400 text-sm mt-3 hidden">Kunci salah atau sesi kedaluwarsa.</p>
    </div>

    <!-- Dashboard Screen -->
    <div id="dashboard-screen" class="max-w-6xl mx-auto hidden">
        <div class="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h1 class="text-3xl font-bold text-neon">Infra Monitor</h1>
            <div class="flex gap-3">
                <button onclick="logout()" class="px-4 py-2 bg-red-900/50 hover:bg-red-900 border border-red-800 rounded-lg text-sm font-semibold text-red-200 transition-colors">
                    Logout
                </button>
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-6 border-b border-slate-700 mb-6">
            <button onclick="switchTab('tokens')" id="tab-tokens" class="pb-2 text-slate-400 hover:text-slate-200 font-semibold tab-active">Token Usage</button>
            <button onclick="switchTab('routing')" id="tab-routing" class="pb-2 text-slate-400 hover:text-slate-200 font-semibold">AI Routing & Models</button>
            <button onclick="switchTab('blocks')" id="tab-blocks" class="pb-2 text-slate-400 hover:text-slate-200 font-semibold">User Access Control</button>
        </div>

        <!-- Token Usage Tab -->
        <div id="view-tokens">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold border-b border-slate-700 pb-2">Realtime In-Memory Usage (Today)</h2>
                <button onclick="fetchStats()" class="px-3 py-1 bg-sky-600 hover:bg-sky-500 rounded text-xs font-semibold transition-colors">Refresh</button>
            </div>
            <div id="memory-stats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <div class="card text-center text-slate-400">Loading...</div>
            </div>

            <h2 class="text-xl font-semibold mb-4 border-b border-slate-700 pb-2">Database History (Last 30 Days)</h2>
            <div class="card overflow-hidden p-0">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-800 text-slate-300">
                        <tr>
                            <th class="px-4 py-3">Date</th>
                            <th class="px-4 py-3">User</th>
                            <th class="px-4 py-3">Task Type</th>
                            <th class="px-4 py-3">Model</th>
                            <th class="px-4 py-3">Provider</th>
                            <th class="px-4 py-3">Prompt</th>
                            <th class="px-4 py-3">Comp</th>
                            <th class="px-4 py-3 text-neon font-bold">Total</th>
                        </tr>
                    </thead>
                    <tbody id="history-stats" class="divide-y divide-slate-700">
                        <tr><td colspan="8" class="px-4 py-3 text-center text-slate-400">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Routing & Models Tab -->
        <div id="view-routing" class="hidden">
             <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold border-b border-slate-700 pb-2">Active Task Routing</h2>
                <button onclick="fetchRouting()" class="px-3 py-1 bg-sky-600 hover:bg-sky-500 rounded text-xs font-semibold transition-colors">Refresh</button>
            </div>
            <div class="card overflow-hidden p-0">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-800 text-slate-300">
                        <tr>
                            <th class="px-4 py-3">Task Type</th>
                            <th class="px-4 py-3">Primary Provider</th>
                            <th class="px-4 py-3">Primary Model</th>
                            <th class="px-4 py-3">Temp</th>
                            <th class="px-4 py-3">Fallback</th>
                            <th class="px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody id="routing-table" class="divide-y divide-slate-700">
                        <tr><td colspan="6" class="px-4 py-3 text-center text-slate-400">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- User Access Control Tab -->
        <div id="view-blocks" class="hidden">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold border-b border-slate-700 pb-2">Blocked AI Users</h2>
                <button onclick="fetchBlocks()" class="px-3 py-1 bg-sky-600 hover:bg-sky-500 rounded text-xs font-semibold transition-colors">Refresh</button>
            </div>
            
            <div class="card mb-6 bg-slate-800 border-red-900 border-2">
                <h3 class="text-lg font-bold text-red-400 mb-4">Block a User</h3>
                <div class="flex gap-4 items-end flex-wrap">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1">User Name / Email</label>
                        <input type="text" id="block-username" class="bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="e.g. Faizul">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1">Task Type</label>
                        <select id="block-task" class="bg-slate-900 border border-slate-600 rounded p-2 text-white">
                            <option value="ALL">ALL TASKS (Global Block)</option>
                            <option value="SKILL_INIT_CLASSIFICATION">SKILL_INIT_CLASSIFICATION</option>
                            <option value="SKILL_INIT_DISCOVERY">SKILL_INIT_DISCOVERY</option>
                            <option value="SKILL_INIT_SKILLS">SKILL_INIT_SKILLS</option>
                            <option value="PROJECT_EVIDENCE">PROJECT_EVIDENCE</option>
                            <option value="LEARNING_EVIDENCE">LEARNING_EVIDENCE</option>
                            <option value="QUIZ_GENERATOR">QUIZ_GENERATOR</option>
                            <option value="QUIZ_EVALUATION">QUIZ_EVALUATION</option>
                            <option value="TAXONOMY_CLASSIFICATION">TAXONOMY_CLASSIFICATION</option>
                            <option value="BEHAVIORAL_CAREER_ALIGNMENT">BEHAVIORAL_CAREER_ALIGNMENT</option>
                        </select>
                    </div>
                    <div class="flex-grow">
                        <label class="block text-xs font-bold text-slate-400 mb-1">Reason (Optional)</label>
                        <input type="text" id="block-reason" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="e.g. Spamming requests">
                    </div>
                    <div>
                        <button onclick="submitBlock()" class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors">Block User</button>
                    </div>
                </div>
            </div>

            <div class="card overflow-hidden p-0">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-800 text-slate-300">
                        <tr>
                            <th class="px-4 py-3">User Name</th>
                            <th class="px-4 py-3">Blocked Task</th>
                            <th class="px-4 py-3">Reason</th>
                            <th class="px-4 py-3">Date</th>
                            <th class="px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody id="blocks-table" class="divide-y divide-slate-700">
                        <tr><td colspan="5" class="px-4 py-3 text-center text-slate-400">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>

    <!-- Edit Modal Routing -->
    <div id="edit-modal" class="fixed inset-0 modal hidden flex items-center justify-center z-50 overflow-y-auto py-10">
        <div class="card w-full max-w-md relative my-auto">
            <h2 class="text-xl font-bold text-neon mb-4">Edit Routing Configuration</h2>
            <div class="mb-4">
                <label class="block text-xs font-bold text-slate-400 mb-1">Task Type</label>
                <input type="text" id="edit-task-type" disabled class="w-full bg-slate-800/50 border border-slate-700 rounded p-2 text-slate-300 cursor-not-allowed">
            </div>
            
            <div class="p-3 border border-sky-900 rounded bg-sky-900/10 mb-4">
                <h3 class="text-xs font-bold text-sky-400 mb-2 uppercase tracking-wide">Primary</h3>
                <div class="mb-3">
                    <label class="block text-xs font-bold text-slate-400 mb-1">Provider</label>
                    <select id="edit-provider" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white">
                        <option value="gemini">Gemini</option>
                        <option value="groq">Groq</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">Model Name</label>
                    <input type="text" id="edit-model" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white">
                </div>
            </div>

            <div class="p-3 border border-slate-700 rounded bg-slate-800/30 mb-4">
                <h3 class="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide flex justify-between">
                    <span>Fallback (Optional)</span>
                    <button onclick="clearFallback()" class="text-[10px] text-red-400 hover:text-red-300">Clear</button>
                </h3>
                <div class="mb-3">
                    <label class="block text-xs font-bold text-slate-400 mb-1">Fallback Provider</label>
                    <select id="edit-fallback-provider" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white">
                        <option value="">- None -</option>
                        <option value="gemini">Gemini</option>
                        <option value="groq">Groq</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">Fallback Model</label>
                    <input type="text" id="edit-fallback-model" placeholder="Leave empty for no fallback" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white">
                </div>
            </div>

            <div class="mb-6">
                <label class="block text-xs font-bold text-slate-400 mb-1">Temperature</label>
                <input type="number" step="0.1" min="0" max="2" id="edit-temperature" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white">
            </div>
            
            <div class="flex justify-end gap-3">
                <button onclick="closeModal()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold text-sm">Cancel</button>
                <button onclick="saveRouting()" class="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded font-semibold text-sm">Save Changes</button>
            </div>
        </div>
    </div>

    <script>
        let pollInterval = null;
        let currentTab = 'tokens';
        let currentRoutes = {};

        function getStoredKey() {
            return localStorage.getItem('infra_key');
        }

        function checkAuth() {
            if (getStoredKey()) {
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('dashboard-screen').classList.remove('hidden');
                switchTab('tokens');
            } else {
                document.getElementById('login-screen').classList.remove('hidden');
                document.getElementById('dashboard-screen').classList.add('hidden');
            }
        }

        function login() {
            const key = document.getElementById('secret-key').value;
            if (key) {
                localStorage.setItem('infra_key', key);
                document.getElementById('login-error').classList.add('hidden');
                checkAuth();
            }
        }

        function logout() {
            localStorage.removeItem('infra_key');
            if (pollInterval) clearInterval(pollInterval);
            document.getElementById('secret-key').value = '';
            checkAuth();
        }

        function switchTab(tab) {
            currentTab = tab;
            document.getElementById('tab-tokens').classList.remove('tab-active');
            document.getElementById('tab-routing').classList.remove('tab-active');
            document.getElementById('tab-blocks').classList.remove('tab-active');
            
            document.getElementById('view-tokens').classList.add('hidden');
            document.getElementById('view-routing').classList.add('hidden');
            document.getElementById('view-blocks').classList.add('hidden');

            document.getElementById('tab-' + tab).classList.add('tab-active');
            document.getElementById('view-' + tab).classList.remove('hidden');

            if (pollInterval) clearInterval(pollInterval);

            if (tab === 'tokens') {
                fetchStats();
                pollInterval = setInterval(fetchStats, 5000);
            } else if (tab === 'routing') {
                fetchRouting();
            } else if (tab === 'blocks') {
                fetchBlocks();
            }
        }

        async function fetchStats() {
            const key = getStoredKey();
            if (!key) return;

            try {
                const res = await fetch('/infra/token-stats?key=' + encodeURIComponent(key));
                if (res.status === 401 || res.status === 403) {
                    document.getElementById('login-error').classList.remove('hidden');
                    logout();
                    return;
                }
                
                const data = await res.json();
                
                // Render Memory
                const memContainer = document.getElementById('memory-stats');
                memContainer.innerHTML = '';
                const memoryKeys = Object.keys(data.memory);
                
                if (memoryKeys.length === 0) {
                    memContainer.innerHTML = '<div class="card col-span-full text-center text-slate-400">No active token usage in memory today.</div>';
                } else {
                    memoryKeys.forEach(k => {
                        const stat = data.memory[k];
                        memContainer.innerHTML += \`
                            <div class="card p-4">
                                <h3 class="text-sm font-bold text-slate-200 uppercase truncate" title="\${stat.taskType}">\${stat.taskType}</h3>
                                <div class="text-xs text-sky-400 mb-1">Model: \${stat.model}</div>
                                <div class="text-xs text-slate-400 mb-3">User: \${stat.userName}</div>
                                <div class="grid grid-cols-3 gap-2 text-center">
                                    <div class="bg-slate-800 p-2 rounded">
                                        <div class="text-[10px] text-slate-400 mb-1">Prompt</div>
                                        <div class="text-sm font-semibold">\${stat.promptTokens.toLocaleString()}</div>
                                    </div>
                                    <div class="bg-slate-800 p-2 rounded">
                                        <div class="text-[10px] text-slate-400 mb-1">Comp</div>
                                        <div class="text-sm font-semibold">\${stat.completionTokens.toLocaleString()}</div>
                                    </div>
                                    <div class="bg-slate-700 p-2 rounded border border-slate-600">
                                        <div class="text-[10px] text-sky-400 font-bold mb-1">TOTAL</div>
                                        <div class="text-sm font-bold text-neon">\${stat.totalTokens.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        \`;
                    });
                }

                // Render History
                const histContainer = document.getElementById('history-stats');
                histContainer.innerHTML = '';
                if (data.history.length === 0) {
                    histContainer.innerHTML = '<tr><td colspan="8" class="px-4 py-3 text-center text-slate-400">No history found.</td></tr>';
                } else {
                    data.history.forEach(row => {
                        const dateStr = new Date(row.date).toLocaleDateString();
                        histContainer.innerHTML += \`
                            <tr class="hover:bg-slate-800/50 transition-colors">
                                <td class="px-4 py-3">\${dateStr}</td>
                                <td class="px-4 py-3 font-semibold text-slate-200">\${row.userName}</td>
                                <td class="px-4 py-3 text-xs">\${row.taskType}</td>
                                <td class="px-4 py-3 text-xs">\${row.model}</td>
                                <td class="px-4 py-3 font-semibold uppercase text-xs">\${row.provider}</td>
                                <td class="px-4 py-3">\${row.promptTokens.toLocaleString()}</td>
                                <td class="px-4 py-3">\${row.completionTokens.toLocaleString()}</td>
                                <td class="px-4 py-3 font-bold text-neon">\${row.totalTokens.toLocaleString()}</td>
                            </tr>
                        \`;
                    });
                }
            } catch (err) {
                console.error('Failed to fetch stats', err);
            }
        }

        async function fetchBlocks() {
            const key = getStoredKey();
            if (!key) return;

            try {
                const res = await fetch('/infra/blocks?key=' + encodeURIComponent(key));
                if (res.status === 401 || res.status === 403) return logout();
                const blocks = await res.json();
                
                const container = document.getElementById('blocks-table');
                container.innerHTML = '';
                
                if (blocks.length === 0) {
                     container.innerHTML = '<tr><td colspan="5" class="px-4 py-3 text-center text-slate-400">No users are currently blocked.</td></tr>';
                } else {
                    blocks.forEach(b => {
                        const dateStr = new Date(b.createdAt).toLocaleString();
                        container.innerHTML += \`
                            <tr class="hover:bg-slate-800/50 transition-colors">
                                <td class="px-4 py-3 font-bold text-slate-200">\${b.userName}</td>
                                <td class="px-4 py-3">
                                    <span class="bg-red-900/50 text-red-200 px-2 py-1 rounded text-xs border border-red-800">\${b.taskType}</span>
                                </td>
                                <td class="px-4 py-3 text-sm text-slate-300">\${b.reason || '-'}</td>
                                <td class="px-4 py-3 text-xs text-slate-500">\${dateStr}</td>
                                <td class="px-4 py-3">
                                    <button onclick="unblockUser('\${b.id}')" class="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-white transition-colors">Unblock</button>
                                </td>
                            </tr>
                        \`;
                    });
                }
            } catch (err) {
                console.error('Failed to fetch blocks', err);
            }
        }

        async function submitBlock() {
            const key = getStoredKey();
            const userName = document.getElementById('block-username').value;
            const taskType = document.getElementById('block-task').value;
            const reason = document.getElementById('block-reason').value;

            if (!userName) return alert('Username is required');

            try {
                const res = await fetch('/infra/blocks?key=' + encodeURIComponent(key), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userName, taskType, reason })
                });
                
                if (res.ok) {
                    document.getElementById('block-username').value = '';
                    document.getElementById('block-reason').value = '';
                    fetchBlocks();
                } else {
                    alert('Gagal memblokir user');
                }
            } catch(e) {
                alert('Error');
            }
        }

        async function unblockUser(id) {
            const key = getStoredKey();
            if (!confirm('Are you sure you want to unblock this user?')) return;
            
            try {
                const res = await fetch('/infra/blocks/' + id + '?key=' + encodeURIComponent(key), {
                    method: 'DELETE'
                });
                if (res.ok) fetchBlocks();
            } catch(e) {
                alert('Error');
            }
        }

        async function fetchRouting() {
            const key = getStoredKey();
            if (!key) return;

            try {
                const res = await fetch('/infra/routing-config?key=' + encodeURIComponent(key));
                if (res.status === 401 || res.status === 403) return logout();
                const routes = await res.json();
                currentRoutes = routes;

                const container = document.getElementById('routing-table');
                container.innerHTML = '';
                
                Object.keys(routes).forEach(task => {
                    const r = routes[task];
                    let fallbackHtml = '<span class="text-slate-500 italic text-xs">None</span>';
                    if (r.fallbacks && r.fallbacks.length > 0) {
                        const fb = r.fallbacks[0];
                        fallbackHtml = \`
                            <span class="bg-slate-700 px-1.5 py-0.5 rounded border border-slate-600 uppercase text-[10px]">\${fb.provider}</span>
                            <span class="text-slate-400 text-xs ml-1">\${fb.model}</span>
                        \`;
                    }

                    container.innerHTML += \`
                        <tr class="hover:bg-slate-800/50 transition-colors">
                            <td class="px-4 py-3 font-bold text-slate-200">\${task}</td>
                            <td class="px-4 py-3 uppercase text-xs">
                                <span class="bg-slate-700 px-2 py-1 rounded border border-slate-600">\${r.provider}</span>
                            </td>
                            <td class="px-4 py-3 text-sky-300 font-medium">\${r.model}</td>
                            <td class="px-4 py-3">\${r.temperature}</td>
                            <td class="px-4 py-3">\${fallbackHtml}</td>
                            <td class="px-4 py-3">
                                <button onclick="openModal('\${task}')" class="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-white transition-colors">Edit</button>
                            </td>
                        </tr>
                    \`;
                });
            } catch (err) {
                console.error('Failed to fetch routing', err);
            }
        }

        function openModal(taskType) {
            const r = currentRoutes[taskType];
            if (!r) return;

            document.getElementById('edit-task-type').value = taskType;
            document.getElementById('edit-provider').value = r.provider;
            document.getElementById('edit-model').value = r.model;
            document.getElementById('edit-temperature').value = r.temperature;
            
            if (r.fallbacks && r.fallbacks.length > 0) {
                document.getElementById('edit-fallback-provider').value = r.fallbacks[0].provider;
                document.getElementById('edit-fallback-model').value = r.fallbacks[0].model;
            } else {
                document.getElementById('edit-fallback-provider').value = '';
                document.getElementById('edit-fallback-model').value = '';
            }

            document.getElementById('edit-modal').classList.remove('hidden');
        }

        function closeModal() {
            document.getElementById('edit-modal').classList.add('hidden');
        }

        function clearFallback() {
            document.getElementById('edit-fallback-provider').value = '';
            document.getElementById('edit-fallback-model').value = '';
        }

        async function saveRouting() {
            const key = getStoredKey();
            const fallbackProvider = document.getElementById('edit-fallback-provider').value;
            const fallbackModel = document.getElementById('edit-fallback-model').value;
            
            const payload = {
                taskType: document.getElementById('edit-task-type').value,
                provider: document.getElementById('edit-provider').value,
                model: document.getElementById('edit-model').value,
                temperature: parseFloat(document.getElementById('edit-temperature').value)
            };

            if (fallbackProvider && fallbackModel) {
                payload.fallbackProvider = fallbackProvider;
                payload.fallbackModel = fallbackModel;
            }

            try {
                const res = await fetch('/infra/routing-config?key=' + encodeURIComponent(key), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    closeModal();
                    fetchRouting(); // Refresh table
                } else {
                    alert('Gagal menyimpan konfigurasi');
                }
            } catch(e) {
                alert('Gagal menyimpan konfigurasi');
            }
        }

        // Initialize view based on auth state
        checkAuth();
    </script>
</body>
</html>
    `;
  }
}
