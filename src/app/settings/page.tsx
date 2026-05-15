"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { useStore } from "@/store";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TAG_COLORS, cn } from "@/lib/utils";
import { Sun, Moon, Monitor, Plus, Trash2, Tag } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { tags, addTag, deleteTag } = useStore();
  const [tagOpen, setTagOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    addTag({ name: tagName.trim(), color: tagColor });
    setTagName("");
    setTagColor(TAG_COLORS[0]);
    setTagOpen(false);
  };

  return (
    <>
      <Header title="Settings" />

      <div className="p-4 md:p-6 space-y-6 max-w-2xl">
        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Label className="text-sm font-medium mb-3 block">Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "light", icon: Sun, label: "Light" },
                { value: "dark", icon: Moon, label: "Dark" },
                { value: "system", icon: Monitor, label: "System" },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                    theme === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <Icon className={cn("h-5 w-5", theme === value && "text-primary")} />
                  <span className={cn("text-sm font-medium", theme === value && "text-primary")}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Tags</CardTitle>
                <CardDescription>Organize tasks with custom tags</CardDescription>
              </div>
              <Button size="sm" onClick={() => setTagOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Tag
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tags yet. Create some to organize your tasks.
              </p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm font-medium">{tag.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete tag "${tag.name}"?`)) deleteTag(tag.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm text-muted-foreground">
            <p>Smart Work Tracker v1.0</p>
            <p>Your data is stored locally in your browser. No account required.</p>
            <p className="text-xs">All tasks, projects and tags persist across sessions.</p>
          </CardContent>
        </Card>
      </div>

      {/* Add tag dialog */}
      <Dialog open={tagOpen} onOpenChange={(v) => !v && setTagOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Tag</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTag} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tag name *</Label>
              <Input
                placeholder="e.g. Design, Dev, Review..."
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTagColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      tagColor === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Preview</Label>
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
                style={{ backgroundColor: tagColor }}
              >
                <Tag className="h-3 w-3" />
                {tagName || "Tag name"}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTagOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!tagName.trim()}>
                Create Tag
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
