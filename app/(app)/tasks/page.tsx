
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreVertical, Pencil, Trash2, Lock, Filter, FilterX, Download, FileText, File } from 'lucide-react';
import { useAppState } from '@/hooks/use-store';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Task, TaskStatus, ApprovalStatus } from '@/lib/definitions';
import { TaskForm } from '@/components/task-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { deleteTask } from '@/lib/store';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


const ALL_PROJECTS = 'all';
const REJECTION_LIMIT = 3;

const statusStyles: { [key in TaskStatus]: string } = {
  todo: "bg-gray-200 text-gray-800",
  "in-progress": "bg-blue-200 text-blue-800",
  done: "bg-green-200 text-green-800",
};


export default function TasksPage() {
  const { tasks, projects, currentUser, userVisibleProjects, isLoaded } = useAppState();
  const { toast } = useToast();

  const [isSheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState('');

  const [selectedProject, setSelectedProject] = useState<string>(ALL_PROJECTS);
  const [localSelectedProject, setLocalSelectedProject] = useState<string>(ALL_PROJECTS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);


  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'N/A';

  const filteredTasks = useMemo(() => {
    const sortedTasks = [...tasks].sort((a, b) => {
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });

    if (!currentUser) return [];
    const userTasks = currentUser.role === 'admin'
      ? sortedTasks
      : sortedTasks.filter(t => userVisibleProjects.some(p => p.id === t.project_id));

    if (selectedProject === ALL_PROJECTS) {
      return userTasks;
    }
    return userTasks.filter((task) => task.project_id === selectedProject);
  }, [tasks, selectedProject, currentUser, userVisibleProjects]);


  const handleAddTaskClick = () => {
    setEditingTask(undefined);
    setSheetOpen(true);
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setSheetOpen(true);
  }

  const handleDeleteTask = (id: string) => {
    setDeletingTaskId(id);
    setRequestMessage('');
  }

  const handleDeleteConfirm = async () => {
    if (deletingTaskId && currentUser) {
      if (currentUser.role === 'admin') {
        await deleteTask(deletingTaskId, currentUser);
        toast({
          title: 'Success!',
          description: 'Task has been deleted.',
        });
      } else {
        await deleteTask(deletingTaskId, currentUser, requestMessage);
        toast({
          title: 'Request Submitted',
          description: 'Your deletion request has been submitted for approval.',
        });
      }
      setDeletingTaskId(null);
    }
  };

  const getStatusBadge = (status?: ApprovalStatus) => {
    switch (status) {
      case 'pending-create':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Pending Approval</Badge>;
      case 'pending-edit':
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Pending Edit</Badge>;
      case 'pending-delete':
        return <Badge variant="destructive">Pending Delete</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  }

  const isFiltered = selectedProject !== ALL_PROJECTS;

  const summary = useMemo(() => {
    if (!isLoaded) return { todo: 0, inProgress: 0, done: 0 };
    return {
      todo: filteredTasks.filter(t => t.status === 'todo').length,
      inProgress: filteredTasks.filter(t => t.status === 'in-progress').length,
      done: filteredTasks.filter(t => t.status === 'done').length,
    };
  }, [filteredTasks, isLoaded]);

  const applyFilters = () => {
    setSelectedProject(localSelectedProject);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setLocalSelectedProject(ALL_PROJECTS);
    setSelectedProject(ALL_PROJECTS);
    setIsFilterOpen(false);
  };

  const exportToPDF = () => {
    if (filteredTasks.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const doc = new jsPDF();
    doc.text('Tasks Report', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Title', 'Project', 'Description', 'Status', 'Due Date']],
      body: filteredTasks.map(t => [
        t.title,
        getProjectName(t.project_id),
        t.description || 'N/A',
        t.status,
        t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A',
      ]),
    });
    doc.save('tasks_report.pdf');
  };

  const exportToExcel = () => {
    if (filteredTasks.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      filteredTasks.map(t => ({
        'Title': t.title,
        'Project': getProjectName(t.project_id),
        'Description': t.description || 'N/A',
        'Status': t.status,
        'Due Date': t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A',
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    XLSX.writeFile(workbook, 'tasks_report.xlsx');
  };


  return (
    <TooltipProvider>
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Task Management</h1>
            <p className="text-sm text-muted-foreground">Manage and track progress of construction tasks across your projects.</p>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn("rounded-xl border-border/50 shadow-sm", isFiltered && "bg-primary/5 border-primary/20 text-primary font-semibold")}>
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {isFiltered && <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-0 rounded-full h-5 px-1.5 min-w-[20px] justify-center text-[10px]">Active</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-80 p-4 space-y-4 rounded-2xl shadow-xl border-border/50"
                align="end"
              >
                <div className="space-y-4">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Project</Label>
                    <Combobox
                      options={[
                        { value: ALL_PROJECTS, label: 'All Projects' },
                        ...userVisibleProjects.map(p => ({ value: p.id, label: p.name }))
                      ]}
                      value={localSelectedProject}
                      onChange={setLocalSelectedProject}
                      placeholder="All Projects"
                      searchPlaceholder="Search projects..."
                      notFoundMessage="No projects found."
                    />
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-border/50" />
                <div className="flex items-center gap-3">
                  <Button variant="ghost" className="flex-1 rounded-xl text-muted-foreground" onClick={clearFilters} disabled={!isFiltered}><FilterX className="mr-2 h-4 w-4" />Reset</Button>
                  <Button className="flex-[1.5] rounded-xl bg-primary shadow-lg shadow-primary/20" onClick={applyFilters}>Apply Filters</Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl border-border/50 shadow-sm"><Download className="mr-2 h-4 w-4" /> Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem onClick={exportToPDF} className="rounded-lg"><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel} className="rounded-lg"><File className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={handleAddTaskClick} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-xl border border-border/50 bg-slate-50/30 dark:bg-slate-900/20 p-3 shadow-sm border-l-4 border-l-slate-400 flex flex-col justify-center">
            <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter mb-0.5">To Do</p>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-none">{summary.todo} Tasks</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-blue-50/30 dark:bg-blue-900/20 p-3 shadow-sm border-l-4 border-l-blue-500 flex flex-col justify-center">
            <p className="text-[9px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-tighter mb-0.5">In Progress</p>
            <div className="text-sm font-bold text-blue-900 dark:text-blue-100 truncate leading-none">{summary.inProgress} Tasks</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-emerald-50/30 dark:bg-emerald-900/20 p-3 shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-center">
            <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter mb-0.5">Completed</p>
            <div className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate leading-none">{summary.done} Tasks</div>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {!isLoaded ? (
              <div className="h-96 flex items-center justify-center">
                <p className="text-muted-foreground">Loading tasks...</p>
              </div>
            ) : filteredTasks.length > 0 ? (
              <>
                {/* Mobile View */}
                <div className="md:hidden">
                  {filteredTasks.map(task => {
                    const isPending = task.approval_status && task.approval_status !== 'approved';
                    const isLocked = (task.rejection_count || 0) >= REJECTION_LIMIT && currentUser?.role !== 'admin';
                    return (
                      <Card key={task.id} className={cn("border-x-0 border-t-0 rounded-none first:border-t", isPending && "bg-muted/50")}>
                        <CardContent className="p-3 flex justify-between items-start gap-2">
                          <div className='flex-1 space-y-1 min-w-0'>
                            <p className="font-semibold truncate">{task.title}</p>
                            <p className="text-sm text-muted-foreground">{getProjectName(task.project_id)}</p>
                            {isPending && <div className="mt-1 text-xs">{getStatusBadge(task.approval_status)}</div>}
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div className="flex flex-col items-end">
                              <Badge variant="secondary" className={cn("capitalize border-none", statusStyles[task.status])}>
                                {task.status.replace('-', ' ')}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditTask(task)} disabled={isPending || isLocked}>
                                  {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />} Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTask(task.id)} disabled={isPending || isLocked}>
                                  {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
                {/* Desktop View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map(task => {
                        const isPending = task.approval_status && task.approval_status !== 'approved';
                        const isLocked = (task.rejection_count || 0) >= REJECTION_LIMIT && currentUser?.role !== 'admin';
                        return (
                          <TableRow key={task.id} className={cn(isPending && "bg-muted/50")}>
                            <TableCell className="font-medium">
                              {task.title}
                              {isPending && <div className="text-xs text-muted-foreground">{getStatusBadge(task.approval_status)}</div>}
                            </TableCell>
                            <TableCell>{getProjectName(task.project_id)}</TableCell>
                            <TableCell className="max-w-[300px] truncate">{task.description}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn("capitalize border-none", statusStyles[task.status])}>
                                {task.status.replace('-', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <DropdownMenuItem onClick={() => handleEditTask(task)} disabled={isPending || isLocked}>
                                          {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />} Edit
                                        </DropdownMenuItem>
                                      </div>
                                    </TooltipTrigger>
                                    {isLocked && <TooltipContent><p>Locked due to multiple rejections.</p></TooltipContent>}
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => handleDeleteTask(task.id)}
                                          disabled={isPending || isLocked}
                                        >
                                          {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
                                        </DropdownMenuItem>
                                      </div>
                                    </TooltipTrigger>
                                    {isLocked && <TooltipContent><p>Locked due to multiple rejections.</p></TooltipContent>}
                                  </Tooltip>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                      }
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 border-dashed text-center">
                <h3 className="mt-4 text-lg font-semibold">No Tasks Found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Get started by creating a new task.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isSheetOpen} onOpenChange={setSheetOpen}>
          <DialogContent className="w-full max-w-none sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Add a New Task'}</DialogTitle>
              <DialogDescription>Fill out the details for your task below.</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <TaskForm setOpen={setSheetOpen} task={editingTask} />
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingTaskId} onOpenChange={() => setDeletingTaskId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {currentUser?.role === 'admin' ? 'This will permanently delete this task.' : 'This will submit a deletion request. If you\'d like, you can provide a message to the admin.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {currentUser?.role !== 'admin' && (
              <div className="py-4 space-y-2">
                <Label htmlFor="request_message">Message for Admin (Optional)</Label>
                <Textarea
                  id="request_message"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="e.g. This task is a duplicate."
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>
                {currentUser?.role === 'admin' ? 'Delete Task' : 'Submit Deletion Request'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}


