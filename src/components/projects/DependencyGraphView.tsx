import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CardSkeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useDependencyGraph } from '@/hooks/queries/useRoadmap'
import { toApiError } from '@/lib/error'
import type { DependencyGraphNode, DependencyGraphEdge } from '@/types/issue-link.types'
import type { StatusCategory } from '@/types/workflow.types'

export interface DependencyGraphViewProps {
  projectId: string
}

// Matches WorkflowCanvas's own category accents, so a node reads the same color as it does on the
// board, regardless of which view you're looking at it from.
const CATEGORY_ACCENT: Record<StatusCategory, string> = {
  'To Do': '#94a3b8',
  'In Progress': '#3b82f6',
  Done: '#10b981',
}

interface IssueNodeData extends Record<string, unknown> {
  label: string
  issueKey: string | null
  category: StatusCategory
  external: boolean
  projectName?: string
}

function IssueNode({ data }: NodeProps<Node<IssueNodeData>>) {
  return (
    <div
      className="rounded-lg border bg-card px-4 py-2 text-sm shadow-soft"
      style={{
        borderColor: CATEGORY_ACCENT[data.category],
        borderStyle: data.external ? 'dashed' : 'solid',
        maxWidth: 220,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: CATEGORY_ACCENT[data.category] }}
        />
        <span className="truncate font-medium">
          {data.issueKey && (
            <span className="mr-1 font-mono text-xs text-muted-foreground">{data.issueKey}</span>
          )}
          {data.label}
        </span>
      </div>
      {data.external && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{data.projectName}</p>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const NODE_TYPES = { issue: IssueNode }

/** Two columns: this project's own issues on the left, cross-project ("external") issues touched
 * by a link on the right - no force-directed layout library is installed, and a simple two-column
 * split reads clearly for the graph sizes this view is meant for (a project's own dependencies,
 * not an org-wide graph). */
function layoutNodes(nodes: DependencyGraphNode[]): Node[] {
  const internal = nodes.filter((n) => !n.external)
  const external = nodes.filter((n) => n.external)
  const toNode = (n: DependencyGraphNode, x: number, y: number): Node => ({
    id: n.id,
    type: 'issue',
    position: { x, y },
    data: {
      label: n.title,
      issueKey: n.issueKey,
      category: n.statusCategory,
      external: n.external,
      projectName: n.projectName,
    },
    draggable: true,
  })
  return [
    ...internal.map((n, i) => toNode(n, 40, i * 90 + 40)),
    ...external.map((n, i) => toNode(n, 400, i * 90 + 40)),
  ]
}

function layoutEdges(edges: DependencyGraphEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.linkTypeName,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: e.isBlocking ? '#dc2626' : '#94a3b8', strokeWidth: e.isBlocking ? 2 : 1 },
  }))
}

/** Module 1's per-project dependency graph (BRD: "visualize how issues in this project block or
 * relate to issues elsewhere"). Read-only - links are created/removed from each issue's own detail
 * page (IssueLinksSection); this view is for seeing the shape of the graph, mirroring
 * WorkflowCanvas's node/edge visualization pattern (same @xyflow/react library, no new dependency). */
export function DependencyGraphView({ projectId }: DependencyGraphViewProps) {
  const { data, isLoading, isError, error, refetch } = useDependencyGraph(projectId)
  const navigate = useNavigate()

  const nodes = useMemo(() => layoutNodes(data?.nodes ?? []), [data])
  const edges = useMemo(() => layoutEdges(data?.edges ?? []), [data])

  if (isLoading) return <CardSkeleton />
  if (isError) {
    return <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
  }
  if (!data || data.nodes.length === 0) {
    return (
      <EmptyState
        title="No linked issues yet"
        description="Link an issue to another from its detail page to see the dependency graph here."
      />
    )
  }

  return (
    <div data-testid="dependency-graph" className="h-96 rounded-lg border bg-muted/20">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          nodesConnectable={false}
          nodesDraggable
          elementsSelectable
          onNodeClick={(_, node) => navigate(`/tasks/${node.id}`)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
