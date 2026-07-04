import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { Frequency, Target } from "@/types";

const EMOJI_OPTIONS = ["🏋️", "💧", "📚", "⏳", "👣", "🧘", "🥗", "🎸", "🏃", "😴", "✍️", "🚭"];
const COLOR_OPTIONS = ["#b3813f", "#3f7fb3", "#6f5aa3", "#a34c4c", "#4c9a6a", "#c2914a"];

interface AddTargetDialogProps {
  onCreate: (input: Pick<Target, "title" | "emoji" | "frequency" | "colorHex" | "weeklyGoal">) => void;
}

export function AddTargetDialog({ onCreate }: AddTargetDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [colorHex, setColorHex] = useState(COLOR_OPTIONS[0]);

  function reset() {
    setTitle("");
    setEmoji(EMOJI_OPTIONS[0]);
    setFrequency("daily");
    setWeeklyGoal(3);
    setColorHex(COLOR_OPTIONS[0]);
  }

  function submit() {
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      emoji,
      frequency,
      colorHex,
      weeklyGoal: frequency === "weekly" ? weeklyGoal : undefined,
    });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          <Plus className="h-4 w-4" />
          Add a target
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New target</DialogTitle>
          <DialogDescription>
            Something you want to hold yourself accountable for.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="target-title">Title</Label>
            <Input
              id="target-title"
              placeholder="e.g. Walk 10k steps"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setEmoji(opt)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors ${
                    emoji === opt ? "border-accent bg-accent/15" : "border-border"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorHex(c)}
                  className="h-8 w-8 rounded-full ring-offset-2 transition-shadow"
                  style={{
                    backgroundColor: c,
                    boxShadow: colorHex === c ? `0 0 0 2px ${c}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency === "weekly" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weekly-goal">Times per week</Label>
              <Input
                id="weekly-goal"
                type="number"
                min={1}
                max={7}
                value={weeklyGoal}
                onChange={(e) => setWeeklyGoal(Number(e.target.value) || 1)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={!title.trim()}>
            Create target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
