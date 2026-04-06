'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { AnalyzeResult } from '@/types';

interface UploadModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'capture' | 'analyzing' | 'review' | 'saving';

export default function UploadModal({ userId, onClose, onSuccess }: UploadModalProps) {
  const [step, setStep] = useState<Step>('capture');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState<AnalyzeResult | null>(null);
  const [form, setForm] = useState({ subject: '', due_date: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setStep('analyzing');
    setError(null);

    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/analyze', { method: 'POST', body: fd });

      if (!res.ok) throw new Error('분석 실패');

      const result: AnalyzeResult = await res.json();
      setAnalyzed(result);
      setForm({
        subject: result.subject,
        due_date: result.due_date,
        description: result.description,
      });
      setStep('review');
    } catch (err) {
      setError('이미지 분석에 실패했습니다. 내용을 직접 입력해주세요.');
      const today = new Date();
      today.setDate(today.getDate() + 3);
      setForm({
        subject: '',
        due_date: today.toISOString().split('T')[0],
        description: '',
      });
      setStep('review');
    }
  };

  const handleSave = async () => {
    if (!form.subject || !form.due_date) {
      setError('과목명과 마감일을 입력해주세요.');
      return;
    }

    setStep('saving');
    setError(null);

    try {
      let image_url: string | null = null;

      // Supabase Storage 업로드
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() ?? 'jpg';
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('homework-images')
          .upload(path, imageFile, { upsert: false });

        if (!uploadError) {
          const { data } = supabase.storage
            .from('homework-images')
            .getPublicUrl(path);
          image_url = data.publicUrl;
        }
      }

      const { error: insertError } = await supabase.from('assignments').insert({
        user_id: userId,
        subject: form.subject,
        due_date: form.due_date,
        description: form.description,
        image_url,
        status: 'pending',
      });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
      setStep('review');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      {/* 이미지 전체화면 뷰어 */}
      {imageFullscreen && imagePreview && (
        <div
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          onClick={() => setImageFullscreen(false)}
        >
          <img src={imagePreview} alt="전체화면" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-5 right-5 text-white text-3xl font-bold">✕</button>
        </div>
      )}
      <div className="flex-1 flex items-end">
        <div className="w-full bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-lg font-bold text-gray-800">
              {step === 'capture' && '숙제 사진 추가'}
              {step === 'analyzing' && 'AI 분석 중...'}
              {step === 'review' && '내용 확인'}
              {step === 'saving' && '저장 중...'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="px-5 pb-8">
            {/* STEP 1: 사진 선택 */}
            {step === 'capture' && (
              <div className="space-y-4">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />

                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full bg-blue-500 text-white rounded-2xl py-5 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  <span className="text-3xl">📷</span>
                  <span className="font-semibold">카메라로 촬영</span>
                  <span className="text-sm text-blue-200">숙제를 바로 찍어요</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gray-100 text-gray-700 rounded-2xl py-5 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  <span className="text-3xl">🖼️</span>
                  <span className="font-semibold">갤러리에서 선택</span>
                  <span className="text-sm text-gray-400">저장된 사진을 불러와요</span>
                </button>

                <button
                  onClick={() => {
                    const today = new Date();
                    today.setDate(today.getDate() + 3);
                    setForm({
                      subject: '',
                      due_date: today.toISOString().split('T')[0],
                      description: '',
                    });
                    setStep('review');
                  }}
                  className="w-full bg-green-50 border border-green-200 text-green-700 rounded-2xl py-5 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  <span className="text-3xl">✏️</span>
                  <span className="font-semibold">직접 입력</span>
                  <span className="text-sm text-green-500">수기로 내용을 입력해요</span>
                </button>
              </div>
            )}

            {/* STEP 2: 분석 중 */}
            {step === 'analyzing' && (
              <div className="py-12 flex flex-col items-center gap-6">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="업로드 이미지"
                    className="w-40 h-40 object-cover rounded-2xl shadow-md"
                  />
                )}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-600 font-medium">AI가 숙제를 분석하고 있어요</p>
                  <p className="text-gray-400 text-sm">과목, 마감일, 내용을 자동으로 추출합니다</p>
                </div>
              </div>
            )}

            {/* STEP 3: 내용 확인 및 편집 */}
            {step === 'review' && (
              <div className="space-y-4">
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="업로드 이미지"
                      className="w-full h-44 object-cover rounded-2xl cursor-zoom-in"
                      onClick={() => setImageFullscreen(true)}
                    />
                    <button
                      onClick={() => setImageFullscreen(true)}
                      className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg"
                    >
                      🔍 확대해서 날짜 확인
                    </button>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {analyzed && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
                    <span>✨</span>
                    <span>AI가 내용을 분석했어요. 사진 확대 후 날짜를 꼭 확인하세요!</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      과목명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="예: 수학, 영어, 국어"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
                    <label className="text-sm font-bold text-orange-700 mb-2 block">
                      📅 마감일 <span className="text-red-500">*</span>
                      <span className="text-xs font-normal ml-1">— 위 사진 확대해서 날짜 확인 후 수정하세요</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={form.due_date ? parseInt(form.due_date.split('-')[1]) : ''}
                          onChange={(e) => {
                            const parts = form.due_date ? form.due_date.split('-') : [new Date().getFullYear().toString(), '01', '01'];
                            const month = e.target.value.padStart(2, '0');
                            setForm({ ...form, due_date: `${parts[0]}-${month}-${parts[2]}` });
                          }}
                          placeholder="월"
                          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">월</span>
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={form.due_date ? parseInt(form.due_date.split('-')[2]) : ''}
                          onChange={(e) => {
                            const parts = form.due_date ? form.due_date.split('-') : [new Date().getFullYear().toString(), '01', '01'];
                            const day = e.target.value.padStart(2, '0');
                            setForm({ ...form, due_date: `${parts[0]}-${parts[1]}-${day}` });
                          }}
                          placeholder="일"
                          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">일</span>
                      </div>
                      <div className="flex-[1.5] relative">
                        <input
                          type="number"
                          min="2024"
                          max="2099"
                          value={form.due_date ? parseInt(form.due_date.split('-')[0]) : ''}
                          onChange={(e) => {
                            const parts = form.due_date ? form.due_date.split('-') : [new Date().getFullYear().toString(), '01', '01'];
                            setForm({ ...form, due_date: `${e.target.value}-${parts[1]}-${parts[2]}` });
                          }}
                          placeholder="연도"
                          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">년</span>
                      </div>
                    </div>
                    {form.due_date && (
                      <p className="text-xs text-orange-600 font-medium mt-2 text-center">
                        → {new Date(form.due_date + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      숙제 내용
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      placeholder="숙제 내용을 입력하세요"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="w-full bg-blue-500 text-white rounded-2xl py-4 font-semibold text-base active:scale-95 transition-transform mt-2"
                >
                  캘린더에 등록하기
                </button>
              </div>
            )}

            {/* STEP 4: 저장 중 */}
            {step === 'saving' && (
              <div className="py-12 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600 font-medium">캘린더에 등록 중...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
