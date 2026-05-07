"use client";

import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  Plus,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ArrayBuilderProps<T = unknown> {
  items?: T[];
  value: T[];
  onChange: (items: T[]) => void;
  renderRow: (item: T, index: number) => React.ReactNode;
  renderCollapsedTitle?: (item: T) => React.ReactNode;
  addLabel?: string;
  blockKind?: string;
}

interface DraggableRowProps<T = unknown> {
  id: string;
  item: T;
  index: number;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  renderRow: (item: T, index: number) => React.ReactNode;
  renderCollapsedTitle?: (item: T) => React.ReactNode;
}

function DraggableRow<T = unknown>({
  id,
  item,
  index,
  onDelete,
  onDuplicate,
  renderRow,
  renderCollapsedTitle,
}: DraggableRowProps<T>) {
  const [isExpanded, setIsExpanded] = useState(true);
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

  const title = renderCollapsedTitle
    ? renderCollapsedTitle(item)
    : `Item ${index + 1}`;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-3 space-y-2 bg-white border border-gray-200"
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded"
          title="Drag to reorder"
        >
          <GripVertical size={16} className="text-gray-400" />
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="flex-1 text-sm font-medium text-gray-700">{title}</div>

        <button
          onClick={() => onDuplicate(index)}
          className="p-1 hover:bg-gray-100 rounded"
          title="Duplicate"
        >
          <Copy size={16} className="text-gray-600" />
        </button>

        <button
          onClick={() => onDelete(index)}
          className="p-1 hover:bg-red-50 rounded"
          title="Delete"
        >
          <Trash2 size={16} className="text-red-600" />
        </button>
      </div>

      {isExpanded && (
        <div className="pt-2 border-t border-gray-200">
          {renderRow(item, index)}
        </div>
      )}
    </Card>
  );
}

export function ArrayBuilder<T = unknown>({
  value,
  onChange,
  renderRow,
  renderCollapsedTitle,
  addLabel = "Add item",
  blockKind,
}: ArrayBuilderProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = value.findIndex((_, i) => `item-${i}` === active.id);
    const overIndex = value.findIndex((_, i) => `item-${i}` === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    const newItems = [...value];
    const [movedItem] = newItems.splice(activeIndex, 1);
    if (movedItem === undefined) return;
    newItems.splice(overIndex, 0, movedItem);

    onChange(newItems);
  };

  const handleDelete = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleDuplicate = (index: number) => {
    const itemToDuplicate = value[index];
    if (itemToDuplicate === undefined) return;
    const newItems = [...value];
    newItems.splice(index + 1, 0, JSON.parse(JSON.stringify(itemToDuplicate)));
    onChange(newItems);
  };

  const handleAddItem = () => {
    const newItem = {} as T;
    onChange([...value, newItem]);
  };

  const ids = value.map((_, i) => `item-${i}`);

  return (
    <div className="space-y-3" data-testid={`array-builder-${blockKind}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {value.map((item, index) => (
              <DraggableRow
                key={`item-${index}`}
                id={`item-${index}`}
                item={item}
                index={index}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                renderRow={renderRow}
                renderCollapsedTitle={renderCollapsedTitle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        onClick={handleAddItem}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <Plus size={16} className="mr-2" />
        {addLabel}
      </Button>
    </div>
  );
}
