
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAppState } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, CheckCircle, Upload, Trash2, AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { differenceInDays } from 'date-fns';
import { deleteAllData, setFullState, resetData } from '@/lib/store';

const LAST_SYNC_KEY = 'ledgerLinkLastSync';

export default function SettingsPage() {
    const appState = useAppState();
    const { toast } = useToast();
    const [isConnected, setIsConnected] = useState(false);
    const [isAutoSync, setIsAutoSync] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [wasLastSyncMoreThanAWeekAgo, setWasLastSyncMoreThanAWeekAgo] = useState(true);


    const [isRestoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedSyncDate = localStorage.getItem(LAST_SYNC_KEY);
        if (savedSyncDate) {
            const lastSyncDate = new Date(savedSyncDate);
            setLastSync(lastSyncDate);
            setWasLastSyncMoreThanAWeekAgo(differenceInDays(new Date(), lastSyncDate) > 7);
        } else {
            setWasLastSyncMoreThanAWeekAgo(true);
        }
    }, []);


    const handleConnect = () => {
        // This is a placeholder for a real OAuth flow
        toast({
            title: "Connecting to Google Drive...",
            description: "Please follow the steps in the (simulated) popup.",
        });
        setTimeout(() => {
            setIsConnected(true);
            toast({
                title: "Success!",
                description: "Successfully connected to Google Drive.",
            });
        }, 2000);
    }

    const handleManualSync = () => {
        try {
            const dataToBackup = {
                users: appState.users,
                projects: appState.projects,
                ledgers: appState.ledgers,
                transactions: appState.transactions,
                recordables: appState.recordables,
                photos: appState.photos,
                documents: appState.documents,
                labors: appState.labors,
                hajari_records: appState.hajari_records,
                tasks: appState.tasks,
                notifications: appState.notifications,
            };

            const dataStr = JSON.stringify(dataToBackup, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ledgerlink_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            const now = new Date();
            setLastSync(now);
            localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
            setWasLastSyncMoreThanAWeekAgo(false);


            toast({
                title: "Data Exported",
                description: "Your data has been downloaded as a JSON file. Please upload it to your Google Drive.",
            });
        } catch (error) {
            console.error("Failed to export data:", error);
            toast({
                variant: 'destructive',
                title: "Export Failed",
                description: "Could not export your data. Please try again.",
            });
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setRestoreFile(file);
            setRestoreConfirmOpen(true);
        }
    };

    const handleConfirmRestore = () => {
        if (!restoreFile) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    const parsedState = JSON.parse(text);
                    await setFullState(parsedState);
                    toast({
                        title: "Restore Successful",
                        description: "Your data has been restored from the backup file.",
                    });
                }
            } catch (error) {
                console.error("Failed to parse backup file:", error);
                toast({
                    variant: 'destructive',
                    title: "Restore Failed",
                    description: "The selected file is not a valid backup. Please try another file.",
                });
            } finally {
                setRestoreFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.readAsText(restoreFile);
    };

    const handleDeleteAllData = async () => {
        await deleteAllData();
        toast({
            title: "Data Cleared",
            description: "All application data has been deleted.",
        });
    }

    const handleResetData = async () => {
        await resetData();
        toast({
            title: "Data Reset",
            description: "Application has been reset to default data.",
        });
    }

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "New passwords do not match.",
            });
            return;
        }

        setIsChangingPassword(true);
        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                body: JSON.stringify({ currentPassword, newPassword }),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Your password has been updated.",
                });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmNewPassword("");
            } else {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: data.error || "Failed to update password.",
                });
            }
        } catch (err) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "An unexpected error occurred.",
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
                    <p className="text-sm text-muted-foreground">Manage your account preferences, security, and data backups.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Backup & Restore (Experimental/Manual)</CardTitle>
                        <CardDescription>
                            Back up your data manually to a JSON file or restore from a previous backup.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {wasLastSyncMoreThanAWeekAgo && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Backup Recommended</AlertTitle>
                                <AlertDescription>
                                    {lastSync
                                        ? `Your last backup was on ${lastSync.toLocaleDateString()}.`
                                        : 'You have not created a backup yet.'
                                    } It's a good practice to back up your data regularly.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div>
                            <Label className="text-sm font-semibold">Backup</Label>
                            <p className="text-sm text-muted-foreground mb-4">Download a JSON file of all your current application data. Keep this file safe.</p>
                            <Button onClick={handleManualSync}>Download Backup</Button>
                            {lastSync && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Last backup downloaded: {lastSync.toLocaleString()}
                                </p>
                            )}
                        </div>

                        <Separator />

                        <div>
                            <Label className="text-sm font-semibold">Restore</Label>
                            <p className="text-sm text-muted-foreground mb-4">Restore your application from a previously downloaded backup file. This will overwrite all current data.</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".json"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="restore-input"
                            />
                            <Button onClick={() => fileInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                Restore from Backup File
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card id="security">
                    <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>
                            Update your account password to keep your account secure.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                            <div className="space-y-1.5">
                                <Label htmlFor="current-password">Current Password</Label>
                                <input
                                    id="current-password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="new-password">New Password (min 6 chars)</Label>
                                <input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                                <input
                                    id="confirm-new-password"
                                    type="password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <Button type="submit" disabled={isChangingPassword} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                {isChangingPassword ? "Updating..." : "Update Password"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card id="danger-zone" className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        <CardDescription>
                            These actions are irreversible. Please proceed with caution.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-4">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete All Data
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete all your data, including projects, ledgers, transactions, and files. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAllData}>Delete Everything</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline">
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Reset to Default Data
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will clear all your current data and replace it with the application's original default sample data.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleResetData}>Reset Data</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Session</CardTitle>
                        <CardDescription>
                            Sign out of your account from this device.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="destructive"
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="w-full max-w-md"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Overwrite all data?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Restoring from <strong>{restoreFile?.name}</strong> will replace all current data in the application. This action cannot be undone. Are you sure you want to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setRestoreFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                        }}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmRestore}>Overwrite and Restore</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
