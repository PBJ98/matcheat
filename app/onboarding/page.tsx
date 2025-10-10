'use client';
import { useEffect, useState } from 'react';

export default function Onboarding(){
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({
    region: '', mbti:'', bio:'',
    budgetMin: 10000, budgetMax: 30000,
    foodTags: ['korean'], timeWindows: ['weekday-evening']
  });

  async function save(){
    setLoading(true);
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(form)
    });
    setLoading(false);
    if (res.ok) alert('저장 완료');
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-4">온보딩</h1>
      {['region','mbti','bio'].map((k)=> (
        <div key={k} className="mb-3">
          <label className="text-sm">{k}</label>
          <input className="w-full border rounded p-2"
                 value={form[k]}
                 onChange={e=>setForm({...form, [k]: e.target.value})}/>
        </div>
      ))}
      <div className="mb-3">
        <label className="text-sm">budgetMin</label>
        <input type="number" className="w-full border rounded p-2"
               value={form.budgetMin}
               onChange={e=>setForm({...form, budgetMin: Number(e.target.value)})}/>
      </div>
      <div className="mb-3">
        <label className="text-sm">budgetMax</label>
        <input type="number" className="w-full border rounded p-2"
               value={form.budgetMax}
               onChange={e=>setForm({...form, budgetMax: Number(e.target.value)})}/>
      </div>
      <div className="mb-3">
        <label className="text-sm">foodTags (comma)</label>
        <input className="w-full border rounded p-2"
               value={form.foodTags.join(',')}
               onChange={e=>setForm({...form, foodTags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/>
      </div>
      <div className="mb-3">
        <label className="text-sm">timeWindows (comma)</label>
        <input className="w-full border rounded p-2"
               value={form.timeWindows.join(',')}
               onChange={e=>setForm({...form, timeWindows: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/>
      </div>
      <button className="border rounded-2xl px-4 py-2" disabled={loading} onClick={save}>
        저장
      </button>
    </div>
  );
}
