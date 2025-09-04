'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function OrdersPage() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const url = `/api/admin/orders?event_id=${id}&page=1&limit=50&status=all`;
      const res = await fetch(url).then((r) => r.json());
      setRows(res.orders || []);
    })();
  }, [id]);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Pedidos</h1>
      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="p-2">ID</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Total</th>
              <th className="p-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.id}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">${(r.total_amount || 0) / 100}</td>
                <td className="p-2">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500">Sin pedidos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

