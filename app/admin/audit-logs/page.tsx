"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Download, Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch('/api/admin/audit');
                if (!res.ok) {
                    if (res.status === 403) throw new Error("Access Denied");
                    throw new Error("Failed to fetch logs");
                }
                const data = await res.json();
                setLogs(data.data || []);
            } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [toast]);

    const handleExport = () => {
        if (!logs.length) return;

        const headers = ["Date", "User", "Action", "Entity", "Details"];
        const csvContent = [
            headers.join(","),
            ...logs.map(log => [
                `"${format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}"`,
                `"${log.user?.name || log.user?.email || 'Unknown'}"`,
                `"${log.action}"`,
                `"${log.entity}"`,
                `"${log.details || ''}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `audit_logs_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
                    <p className="text-muted-foreground">Track all sensitive actions performed in the system.</p>
                </div>
                <Button onClick={handleExport} disabled={logs.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>System Activity</CardTitle>
                    <CardDescription>Recent actions by all users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Entity</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No logs found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {format(new Date(log.createdAt), 'dd MMM yy HH:mm')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{log.user?.name || 'Unknown'}</span>
                                                <span className="text-xs text-muted-foreground">{log.user?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                log.action === 'DELETE' ? 'destructive' :
                                                    log.action === 'CREATE' ? 'default' :
                                                        log.action === 'UPDATE' ? 'secondary' :
                                                            'outline'
                                            }>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {log.entity}
                                        </TableCell>
                                        <TableCell className="max-w-md truncate" title={log.details}>
                                            {log.details}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
