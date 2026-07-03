"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Crown, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TeamSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onTeamSelect: (teamId: string) => void
  game: any
  playerName: string
  isLoading?: boolean
}

export function TeamSelectionModal({ 
  isOpen, 
  onClose, 
  onTeamSelect, 
  game, 
  playerName,
  isLoading = false 
}: TeamSelectionModalProps) {
  const { toast } = useToast()
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  if (!isOpen) return null

  // Get team configuration from game
  const teamConfig = game.teamConfig || {}
  const numberOfTeams = teamConfig.numberOfTeams || 2
  const playersPerTeam = teamConfig.playersPerTeam || 2

  // Generate team information with custom names from game configuration
  const teams: Array<{
    id: string
    name: string
    players: any[]
    isFull: boolean
    hasLeader: boolean
    canJoin: boolean
  }> = []
  
  for (let i = 1; i <= numberOfTeams; i++) {
    const teamId = `team${i}`
    const teamPlayers = Object.values(game.players || {}).filter((p: any) => p.team === teamId)
    const isFull = teamPlayers.length >= playersPerTeam
    const hasLeader = teamPlayers.some((p: any) => p.isTeamLeader)
    
    // Use custom team names from game configuration if available
    let teamName = `Team ${i}`
    if (game.teamConfigs && Array.isArray(game.teamConfigs)) {
      const teamConfig = game.teamConfigs.find((config: any) => config.id === teamId)
      if (teamConfig && teamConfig.name) {
        teamName = teamConfig.name
      } else {
        // Fallback to default team names if custom names not found
        const defaultTeamNames = ['Kings', 'Queens', 'Aces', 'Jacks']
        teamName = defaultTeamNames[i - 1] || `Team ${i}`
      }
    } else {
      // Fallback to default team names if no teamConfigs
      const defaultTeamNames = ['Kings', 'Queens', 'Aces', 'Jacks']
      teamName = defaultTeamNames[i - 1] || `Team ${i}`
    }
    
    teams.push({
      id: teamId,
      name: teamName,
      players: teamPlayers,
      isFull,
      hasLeader,
      canJoin: !isFull
    })
  }

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeam(teamId)
  }

  const handleConfirm = () => {
    if (!selectedTeam) {
      toast({
        title: "⚠️ No Team Selected",
        description: "Please select a team to join",
        variant: "destructive",
      })
      return
    }

    const selectedTeamData = teams.find(t => t.id === selectedTeam)
    if (!selectedTeamData?.canJoin) {
      toast({
        title: "⚠️ Team Full",
        description: "This team is already full",
        variant: "destructive",
      })
      return
    }

    onTeamSelect(selectedTeam)
  }

  const handleCancel = () => {
    setSelectedTeam(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-slate-900/95 border-slate-700/50 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-amber-400" />
            Choose Your Team
          </CardTitle>
          <CardDescription className="text-slate-400">
            Select which team you'd like to join for {game.title || "this game"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Player Info */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <div className="text-sm text-slate-400 mb-1">Joining as:</div>
            <div className="font-medium text-white">{playerName}</div>
          </div>

          {/* Team Options */}
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedTeam === team.id
                    ? 'border-amber-500 bg-amber-500/10'
                    : team.canJoin
                    ? 'border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-700/30'
                    : 'border-slate-700 bg-slate-800/20 opacity-60 cursor-not-allowed'
                }`}
                onClick={() => team.canJoin && handleTeamSelect(team.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={`${
                        selectedTeam === team.id 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-slate-600/50 text-slate-300'
                      }`}
                    >
                      {team.name}
                    </Badge>
                    {team.hasLeader && (
                      <Crown className="h-4 w-4 text-amber-400" />
                    )}
                  </div>
                  <div className="text-sm text-slate-400">
                    {team.players.length}/{playersPerTeam} players
                  </div>
                </div>

                {/* Team Members */}
                <div className="space-y-1">
                  {team.players.length > 0 ? (
                    team.players.map((player: any) => (
                      <div key={player.id} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        <span className="text-slate-300">
                          {player.name}
                          {player.isTeamLeader && (
                            <Crown className="h-3 w-3 text-amber-400 inline ml-1" />
                          )}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500 italic">No players yet</div>
                  )}
                </div>

                {/* Status Badge */}
                {!team.canJoin && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="destructive" className="text-xs">
                      Full
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Game Info */}
          <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
            <div className="text-xs text-slate-400 space-y-1">
              <div>• {numberOfTeams} teams of {playersPerTeam} players each</div>
              <div>• First player in each team becomes the team leader</div>
              <div>• Teams compete against each other for the highest score</div>
            </div>
          </div>
        </CardContent>

        <div className="flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTeam || isLoading}
            className="flex-1 bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                Joining...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Join Team
              </div>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
