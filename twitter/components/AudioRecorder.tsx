"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, X, Upload, Trash2, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface AudioRecorderProps {
    onAudioReady: (audioUrl: string, duration: number, size: number, format: string) => void;
    onClose: () => void;
    maxDuration?: number;
    maxSize?: number;
}

const TIME_WINDOW_CLASS = 'bg-purple-500' + '/10 border border-purple-500' + '/20 rounded-lg p-3';

function TimeWindowInfo() {
    return (
        <div className={'bg-purple-500/10 border border-purple-500/20 rounded-lg p-3'}>
            <div className="flex items-center gap-2 text-purple-400 text-sm">
                <Clock className="h-4 w-4" />
                <span>Audio tweets only allowed between 2:00 PM - 7:00 PM IST</span>
            </div>
        </div>
    );
}

export default function AudioRecorder({ 
    onAudioReady, 
    onClose, 
    maxDuration = 300, 
    maxSize = 100 * 1024 * 1024 
}: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [recordingTime, setRecordingTime] = useState(0);
    const [error, setError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showAudioOTP, setShowAudioOTP] = useState(false);
    const [audioOTPEmail, setAudioOTPEmail] = useState('');
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement>(new Audio());

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const startRecording = async () => {
        try {
            setError('');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                
                const tempAudio = new Audio(url);
                tempAudio.onloadedmetadata = () => {
                    if(tempAudio.duration === Infinity || isNaN(tempAudio.duration)) {
                        tempAudio.currentTime = 1e101;
                        tempAudio.ontimeupdate = () => {
                            tempAudio.ontimeupdate = null;
                            setDuration(Math.round(tempAudio.duration));
                            tempAudio.currentTime = 0;
                        };
                    } else {
                        setDuration(Math.round(tempAudio.duration));
                    }
                };
            };

            mediaRecorder.start(100);
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    const newTime = prev + 1;
                    if (newTime >= maxDuration) {
                        stopRecording();
                    }
                    return newTime;
                });
            }, 1000);

            setTimeout(() => {
                if (isRecording) stopRecording();
            }, maxDuration * 1000);

        } catch (err) {
            setError('Failed to access microphone. Please check permissions.');
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsRecording(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        if (!file.type.startsWith('audio/')) {
            setError('Please select an audio file');
            return;
        }

        if (file.size > maxSize) {
            setError('File size exceeds 100 MB limit');
            return;
        }

        const url = URL.createObjectURL(file);
        setAudioUrl(url);
        setAudioBlob(file);
        
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
            const dur = Math.round(audio.duration);
            if (dur > maxDuration) {
                setError(`Audio duration (${Math.round(dur/60)} min) exceeds 5 minute limit`);
                removeAudio();
            } else {
                setDuration(dur);
                setError('');
            }
        };
    };

    const removeAudio = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioBlob(null);
        setAudioUrl(null);
        setDuration(0);
        setRecordingTime(0);
        setError('');
    };

    const handleUpload = async () => {
        if (!audioBlob || !audioUrl) return;
        
        setIsUploading(true);
        
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);

            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/audio-tweet/upload-file`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            
            onAudioReady(data.url, duration, audioBlob.size, 'webm');
            setTimeout(() => {
                onClose();
            }, 500);
        } catch (err) {
            console.error('Failed to upload audio:', err);
            setError('Failed to upload audio. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleAudioReady = (url: string, dur: number, size: number, fmt: string) => {
        setAudioUrl(url);
        setDuration(dur);
        setAudioBlob(new Blob([], { type: 'audio/webm' }));
        setAudioOTPEmail('user@example.com');
    };

    return (
        <div className="group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] bg-gray-900 border-gray-800">
            <div className="px-(--card-spacing) p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Add Audio</h3>
                    <button
                        className="p-2 rounded-full hover:bg-gray-700"
                        onClick={onClose}
                        disabled={isRecording || isUploading}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {isRecording ? (
                    <div className="space-y-4 text-center py-6">
                        <div className="text-3xl font-mono text-purple-400">{formatTime(recordingTime)}</div>
                        <button
                            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold"
                            onClick={stopRecording}
                        >
                            Stop Recording
                        </button>
                    </div>
                ) :
                !audioBlob && !audioUrl ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                className="h-24 flex flex-col items-center justify-center gap-2 p-3 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 cursor-pointer"
                                onClick={startRecording}
                                disabled={isUploading}
                            >
                                <Mic className="h-8 w-8 text-purple-500" />
                                <span className="text-sm">Record</span>
                            </button>
                            <button
                                className="h-24 flex flex-col items-center justify-center gap-2 p-3 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 cursor-pointer"
                                onClick={() => document.getElementById('audio-file-input')?.click()}
                                disabled={isUploading}
                            >
                                <Upload className="h-8 w-8 text-blue-500" />
                                <span className="text-sm">Upload</span>
                            </button>
                        </div>
                        <input
                            id="audio-file-input"
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <p className="text-center text-xs text-gray-500">
                            Max 5 minutes • 100 MB max • MP3, WAV, M4A, OGG
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                    <Mic className="h-8 w-8 text-purple-500" />
                                </div>
                                <div className="flex-1">
                                    <audio
                                        ref={audioRef}
                                        src={audioUrl || undefined}
                                        controls
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-400 mt-2">
                                <span>{formatTime(duration)}</span>
                                <span>{formatSize(audioBlob?.size || 0)}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-white hover:bg-gray-700"
                                onClick={removeAudio}
                                disabled={isUploading}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                            </button>
                            <button
                                className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
                                onClick={handleUpload}
                                disabled={isUploading}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Post Audio Tweet
                            </button>
                        </div>

                        <div className={'bg-purple-500/10 border border-purple-500/20 rounded-lg p-3'}>
                            <div className="flex items-center gap-2 text-purple-400 text-sm">
                                <Clock className="h-4 w-4" />
                                <span>Audio tweets only allowed between 2:00 PM - 7:00 PM IST</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}