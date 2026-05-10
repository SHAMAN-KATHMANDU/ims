"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface AnnouncementItemsBuilderProps {
  value: string[];
  onChange: (items: string[]) => void;
  label?: string;
}

// Marquee announcement strip is a flat string array — short claims like
// "Free shipping over Rs 5000". ArrayBuilder is overkill (its row UI assumes
// objects); a tighter sortable-string-row implementation fits the field
// without adding the row-collapse / duplicate ceremony.
export function AnnouncementItemsBuilder({
  value,
  onChange,
  label = "Strip claims",
}: AnnouncementItemsBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    const next = [...value];
    const [moved] = next.splice(oldIndex, 1);
    if (moved !== undefined) next.splice(newIndex, 0, moved);
    onChange(next);
  };

  const updateAt = (i: number, v: string) => {
    const next = [...value];
    next[i] = v;
    onChange(next);
  };
  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, ""]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={value.map((_, i) => String(i))}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {value.map((item, i) => (
              <SortableRow
                key={i}
                id={String(i)}
                value={item}
                onChange={(v) => updateAt(i, v)}
                onRemove={() => removeAt(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button variant="outline" size="sm" onClick={add} className="gap-1">
        <Plus className="h-3.5 w-3.5" />
        Add claim
      </Button>
    </div>
  );
}

function SortableRow({
  id,
  value,
  onChange,
  onRemove,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-2 flex items-center gap-2"
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="text-gray-400 hover:text-gray-600 cursor-grab"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Free shipping over Rs 5,000"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Remove"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </Card>
  );
}
