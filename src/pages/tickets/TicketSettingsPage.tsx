import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TicketAutomationRulesForm } from '@/components/tickets/TicketAutomationRulesForm'
import { TicketScheduledAutomationsForm } from '@/components/tickets/TicketScheduledAutomationsForm'
import { TicketMacrosForm } from '@/components/tickets/TicketMacrosForm'
import { TicketSlaPolicyForm } from '@/components/tickets/TicketSlaPolicyForm'
import { BusinessHoursCalendarForm } from '@/components/tickets/BusinessHoursCalendarForm'
import { TicketAutomationLogList } from '@/components/tickets/TicketAutomationLogList'
import { useAuth } from '@/hooks/useAuth'

/** BRD 3.3's Triggers/Automations/Macros + BRD 3.4's Advanced SLA/Business Hours settings - all
 * org-wide (tickets aren't project-scoped), so this is a standalone top-level page rather than a
 * project settings tab. Every save action is Admin/Manager only; any staff member can view. */
export function TicketSettingsPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole('Admin') || hasRole('Manager')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ticket automation settings"
        description="Triggers, scheduled automations, macros, SLA policy, and business hours for support tickets."
      />

      <Tabs defaultValue="triggers">
        <TabsList className="flex-wrap">
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="scheduled">Automations</TabsTrigger>
          <TabsTrigger value="macros">Macros</TabsTrigger>
          <TabsTrigger value="sla">SLA Policy</TabsTrigger>
          <TabsTrigger value="business-hours">Business Hours</TabsTrigger>
          <TabsTrigger value="log">Automation Log</TabsTrigger>
        </TabsList>

        <TabsContent value="triggers">
          <TicketAutomationRulesForm canManage={canManage} />
        </TabsContent>

        <TabsContent value="scheduled">
          <TicketScheduledAutomationsForm canManage={canManage} />
        </TabsContent>

        <TabsContent value="macros">
          <TicketMacrosForm canManage={canManage} />
        </TabsContent>

        <TabsContent value="sla">
          <TicketSlaPolicyForm canManage={canManage} />
        </TabsContent>

        <TabsContent value="business-hours">
          <BusinessHoursCalendarForm canManage={canManage} />
        </TabsContent>

        <TabsContent value="log">
          <TicketAutomationLogList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
