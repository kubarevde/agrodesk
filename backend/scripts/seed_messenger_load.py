"""Seed a heavy messenger load for local UX checks (optional).

Usage (API must be running, demo org seeded):

  cd backend
  python -m scripts.seed_messenger_load

Creates ~40 direct/group chats and ~120 messages for EMP001↔peers.
Does not change schema or production data outside demo org chats.
"""

from __future__ import annotations

import os
import sys

import httpx

BASE = os.environ.get('API_BASE_URL', 'http://127.0.0.1:8000')


def _login(client: httpx.Client, org_id: str, code: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': code, 'password': '1234', 'org_id': org_id},
    )
    r.raise_for_status()
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def main() -> int:
    with httpx.Client(base_url=BASE, timeout=60) as client:
        orgs = client.get('/api/auth/orgs').json()
        demo = next(
            (o for o in orgs if o.get('slug') in ('demo', 'main') or 'Demo' in (o.get('name') or '')),
            None,
        )
        if not demo:
            print('Demo org not found', file=sys.stderr)
            return 1
        org_id = demo['id']
        admin = _login(client, org_id, 'EMP000')
        emp = _login(client, org_id, 'EMP001')
        peers = client.get('/api/messenger/peers', headers=emp).json()
        if len(peers) < 2:
            print('Need at least 2 peers', file=sys.stderr)
            return 1

        # Groups owned by admin with EMP001
        for i in range(10):
            g = client.post(
                '/api/messenger/chats/group',
                headers=admin,
                json={
                    'name': f'Load Group {i:02d}',
                    'member_ids': [peers[0]['id'], peers[1]['id']],
                },
            )
            g.raise_for_status()
            chat_id = g.json()['id']
            for n in range(12):
                client.post(
                    f'/api/messenger/chats/{chat_id}/messages',
                    headers=emp,
                    json={'body': f'load-group-{i}-msg-{n} ' + ('x' * 40)},
                ).raise_for_status()

        # Direct chats from EMP001
        for idx, peer in enumerate(peers[:20]):
            d = client.post(
                '/api/messenger/chats/direct',
                headers=emp,
                json={'peer_employee_id': peer['id']},
            )
            d.raise_for_status()
            chat_id = d.json()['id']
            for n in range(8):
                client.post(
                    f'/api/messenger/chats/{chat_id}/messages',
                    headers=emp,
                    json={'body': f'load-direct-{idx}-msg-{n}'},
                ).raise_for_status()

        listed = client.get('/api/messenger/chats', headers=emp)
        listed.raise_for_status()
        print(f'OK: EMP001 now has {len(listed.json())} chats (load seed done)')
        return 0


if __name__ == '__main__':
    raise SystemExit(main())
