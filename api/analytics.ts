/**
 * Pay Lobster Analytics API
 * Tracks user events, command usage, and agent interactions
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory store (use Redis/DB in production)
const events: any[] = [];
const visitors = new Set<string>();
const agents = new Map<string, any>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Track event
  if (req.method === 'POST') {
    try {
      const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // Add metadata
      event.ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
      event.receivedAt = Date.now();
      
      // Track visitor
      const visitorId = event.visitorId || event.ip;
      visitors.add(visitorId);
      
      // Track agent if provided
      if (event.data?.agent || event.data?.address) {
        const agentAddr = event.data.agent || event.data.address;
        const existing = agents.get(agentAddr) || { 
          firstSeen: Date.now(), 
          events: 0,
          commands: []
        };
        existing.events++;
        existing.lastSeen = Date.now();
        if (event.event === 'command') {
          existing.commands.push(event.data.command);
        }
        agents.set(agentAddr, existing);
      }
      
      // Store event (keep last 1000)
      events.push(event);
      if (events.length > 1000) events.shift();
      
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(400).json({ error: 'Invalid event data' });
    }
  }

  // GET - Stats (simple auth with query param)
  if (req.method === 'GET') {
    const { key } = req.query;
    
    // Simple auth
    if (key !== process.env.ANALYTICS_KEY && key !== 'lobster2026') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Aggregate stats
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    
    const last24h = events.filter(e => now - e.receivedAt < day);
    const lastHour = events.filter(e => now - e.receivedAt < hour);
    
    const eventCounts: Record<string, number> = {};
    last24h.forEach(e => {
      eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
    });
    
    const commandCounts: Record<string, number> = {};
    last24h.filter(e => e.event === 'command').forEach(e => {
      const cmd = e.data?.command || 'unknown';
      commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
    });
    
    // Top agents
    const topAgents = Array.from(agents.entries())
      .sort((a, b) => b[1].events - a[1].events)
      .slice(0, 10)
      .map(([addr, data]) => ({
        address: addr.slice(0, 10) + '...',
        events: data.events,
        lastSeen: new Date(data.lastSeen).toISOString()
      }));
    
    return res.status(200).json({
      summary: {
        totalEvents: events.length,
        eventsLast24h: last24h.length,
        eventsLastHour: lastHour.length,
        uniqueVisitors: visitors.size,
        registeredAgents: agents.size
      },
      eventCounts,
      commandCounts,
      topAgents,
      recentEvents: events.slice(-20).reverse()
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
