// src/main/pro-bridge.ts
// Lives in the PUBLIC repo. Dynamically imports @void/pro.
// If @void/pro is not installed, all functions return graceful fallbacks.

import { BrowserWindow, app } from 'electron';
import path from 'path';

let proModule: any = null;
let proAvailable = false;
let licenseActive = false;

// Instances (created once from @void/pro if available)
let licenseManager: any = null;
let aiEngine: any = null;
let aiWatcher: any = null;

// --- Init ---

export async function initProBridge(): Promise<boolean> {
  try {
    // Try normal require first (dev mode with symlink)
    try {
      proModule = require('@void/pro');
    } catch {
      // In packaged app, pro files are in extraResources/pro/
      const resourcesPath = path.join(process.resourcesPath || app.getAppPath(), 'pro');
      proModule = require(resourcesPath);
    }
    proAvailable = true;

    licenseManager = new proModule.LicenseManager();
    const status = await licenseManager.validate();
    licenseActive = status.valid;

    if (licenseActive) {
      console.log('[Void Pro] License active. All features unlocked.');
    } else {
      console.log('[Void Pro] Package found but license inactive.');
    }

    return licenseActive;
  } catch {
    proAvailable = false;
    licenseActive = false;
    console.log('[Void] Running free version. Pro features disabled.');
    return false;
  }
}

export function initAIEngine(): void {
  if (!proModule || !licenseActive) return;
  try {
    aiEngine = new proModule.AIEngine();
  } catch {
    aiEngine = null;
  }
}

export function initAIWatcher(memoryStore: any, window: BrowserWindow): void {
  if (!proModule || !licenseActive || !aiEngine) return;
  try {
    aiWatcher = new proModule.AIWatcher(aiEngine, memoryStore, window);
  } catch {
    aiWatcher = null;
  }
}

// --- Status ---

export function isProAvailable(): boolean {
  return proAvailable;
}

// Check license validity and flush if expired
export async function enforceLicenseExpiry(window: BrowserWindow): Promise<void> {
  if (!licenseManager || !proAvailable) return;
  try {
    const status = await licenseManager.validate();
    if (!status.valid) {
      console.log('[Void Pro] License expired or invalid:', status.error);
      licenseActive = false;
      // Flush AI config
      if (aiEngine) {
        aiEngine.setConfig({
          provider: 'anthropic',
          apiKey: undefined,
          features: {
            autoNotes: false, errorExplainer: false, dangerDetection: false,
            autocomplete: false, naturalLanguage: false, securityScanner: false, anomalyDetection: false,
          },
        });
      }
      aiEngine = null;
      aiWatcher = null;
      // Notify renderer to lock Pro features immediately
      try {
        if (!window.isDestroyed()) {
          window.webContents.send('license:expired', { reason: status.error });
        }
      } catch { /* destroyed */ }
    }
  } catch { /* offline — grace period handled by license-manager */ }
}

export function isLicenseActive(): boolean {
  return licenseActive;
}

// --- License ---

export async function activateLicense(key: string, email?: string): Promise<{ success: boolean; error?: string }> {
  if (!proModule) return { success: false, error: 'Pro package not installed. Download from voidterminal.dev' };
  try {
    if (!licenseManager) licenseManager = new proModule.LicenseManager();
    const result = await licenseManager.activate(key, email);
    licenseActive = result.valid ?? result.success ?? false;
    if (licenseActive) {
      initAIEngine();
    }
    return { success: licenseActive, error: result.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deactivateLicense(): Promise<void> {
  if (!licenseManager) return;
  try {
    await licenseManager.deactivate();
  } catch { /* silent */ }
  licenseActive = false;
  aiEngine = null;
  aiWatcher = null;
}

export function getLicenseInfo(): { status: string; plan: string; email?: string; activatedAt?: number } {
  if (!licenseManager || !proAvailable) return { status: 'free', plan: 'free' };
  try {
    return licenseManager.getInfo();
  } catch {
    return { status: 'free', plan: 'free' };
  }
}

// --- AI Functions (all safe to call without Pro) ---

export async function aiExplainError(
  error: string,
  context: string,
): Promise<{ explanation: string; suggestedCommand?: string }> {
  if (!licenseActive || !aiEngine) {
    return { explanation: 'Upgrade to Pro to get AI error explanations.' };
  }
  return aiEngine.explain(error, context);
}

export async function aiCheckDanger(
  command: string,
  server: string,
): Promise<{ isDangerous: boolean; reason?: string }> {
  if (!licenseActive || !aiEngine) return { isDangerous: false };
  return aiEngine.checkDanger(command, server);
}

export async function aiAutocomplete(
  context: string,
  history: string[],
): Promise<string | null> {
  if (!licenseActive || !aiEngine) return null;
  return aiEngine.autocomplete(context, history);
}

export async function aiNaturalLanguage(
  query: string,
  server: string,
): Promise<{ command: string; explanation: string }> {
  if (!licenseActive || !aiEngine) {
    return { command: '', explanation: 'Upgrade to Pro for natural language commands.' };
  }
  return aiEngine.naturalLanguage(query, server);
}

export async function aiChat(
  message: string,
  history: { role: string; content: string }[],
  terminalContext?: string,
  serverInfo?: string,
  modelOverride?: string,
): Promise<string> {
  if (!licenseActive || !aiEngine) {
    return 'AI Chat is a Pro feature. Go to Settings > License to activate.';
  }
  return aiEngine.chat(message, history, terminalContext, serverInfo, modelOverride);
}

export function getAIConfig(): any {
  if (!aiEngine) {
    return {
      provider: null,
      features: {
        autoNotes: false,
        errorExplainer: false,
        dangerDetection: false,
        autocomplete: false,
        naturalLanguage: false,
        securityScanner: false,
        anomalyDetection: false,
      },
    };
  }
  return aiEngine.getConfig();
}

export function setAIConfig(config: any): void {
  if (!aiEngine) return;
  aiEngine.setConfig(config);
}

export async function aiAgentStep(
  messages: any[],
  terminalContext?: string,
  serverInfo?: string,
  memories?: string,
  modelOverride?: string,
): Promise<{ thought: string; action?: any; done?: boolean }> {
  if (!licenseActive || !aiEngine) {
    return { thought: 'AI Agent is a Pro feature.', done: true };
  }
  return aiEngine.agentStep(messages, terminalContext, serverInfo, memories, modelOverride);
}

export async function aiExtractMemories(conversation: string, server: string) {
  if (!aiEngine) return [];
  return aiEngine.extractMemories(conversation, server);
}

export function getAvailableModels() {
  if (!aiEngine) return [];
  return aiEngine.getAvailableModels();
}

export function setAIModel(model: string) {
  if (aiEngine) aiEngine.setModel(model);
}

export function getCurrentModel(): string {
  if (!aiEngine) return '';
  return aiEngine.getCurrentModel();
}

export function getSmartModel(tier: 'light' | 'medium' | 'heavy', availableProviders?: string[]): string {
  if (!aiEngine) return '';
  return aiEngine.getSmartModel(tier, availableProviders);
}

export function getAIWatcher(): any {
  return aiWatcher;
}
