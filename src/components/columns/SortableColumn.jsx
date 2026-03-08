import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Column } from './Column'

export function SortableColumn({ column, liveTaskIds, onOpenDetail }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col-sort-${column.id}`,
    data: { type: 'column', columnId: column.id },
  })
  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, scaleX: 1, scaleY: 1 } : null),
    transition,
  }

  if (isDragging) {
    // Drop indicator — full-width placeholder showing where the list will land
    return (
      <div
        ref={setNodeRef}
        className="md:min-w-[280px] md:w-[320px] shrink-0 rounded-xl border-2 border-dashed min-h-[120px]"
        style={{ ...style, borderColor: 'var(--color-primary-400)', background: 'color-mix(in srgb, var(--color-primary-400) 10%, transparent)' }}
      />
    )
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Column column={column} liveTaskIds={liveTaskIds} onOpenDetail={onOpenDetail}
        dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}
