'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function BotCooldownForm({ initialCooldown = 5 }) {
    const [cooldown, setCooldown] = useState(initialCooldown);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setSaving(false);
            return;
        }

        const { error } = await supabase
            .from('stream_settings')
            .update({ bot_cooldown_seconds: cooldown })
            .eq('user_id', user.id);

        setSaving(false);
    };

    return (
        <Card title="Cooldown Settings">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="cooldown" className="block text-sm font-medium text-gray-700">
                        Bot Cooldown (seconds)
                    </label>
                    <input
                        type="number"
                        id="cooldown"
                        min="1"
                        max="300"
                        value={cooldown}
                        onChange={(e) => setCooldown(Number(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                </div>
                <Button
                    variant="slim"
                    type="submit"
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Cooldown'}
                </Button>
            </form>
        </Card>
    );
}