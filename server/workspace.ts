import { Router } from 'express';
import { getSessionUser } from './auth';
import { getWorkspace, saveWorkspace } from './workspaceStore';

export function createWorkspaceRouter(): Router {
  const router = Router();

  // Load the signed-in user's full workspace (businesses + audits)
  router.get('/', (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const workspace = getWorkspace(user.id);
    return res.json({
      workspace: workspace || {
        businesses: [],
        audits: [],
        activeBusinessId: '',
      },
    });
  });

  // Save the signed-in user's full workspace
  router.put('/', (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const { businesses, audits, activeBusinessId } = (req.body || {}) as {
      businesses?: unknown;
      audits?: unknown;
      activeBusinessId?: unknown;
    };

    if (!Array.isArray(businesses) || !Array.isArray(audits)) {
      return res.status(400).json({ error: 'Invalid workspace data.' });
    }

    const workspace = saveWorkspace(user.id, {
      businesses: businesses as never,
      audits: audits as never,
      activeBusinessId: typeof activeBusinessId === 'string' ? activeBusinessId : '',
    });

    return res.json({ ok: true, workspace });
  });

  return router;
}
