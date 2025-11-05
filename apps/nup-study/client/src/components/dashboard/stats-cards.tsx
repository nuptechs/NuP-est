import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

interface StatsData {
  subjects: number;
  todayHours: number;
  questionsGenerated: number;
  goalProgress: number;
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ["/api/analytics/stats"],
  });

  const statsData = [
    {
      title: "Matérias",
      value: stats?.subjects || 0,
      subtitle: "Cadastradas",
      icon: "fa-book",
      color: "primary",
    },
    {
      title: "Hoje",
      value: `${stats?.todayHours || 0}h`,
      subtitle: "Estudadas",
      icon: "fa-clock",
      color: "secondary",
    },
    {
      title: "IA",
      value: stats?.questionsGenerated || 0,
      subtitle: "Perguntas geradas",
      icon: "fa-question-circle",
      color: "accent",
    },
    {
      title: "Meta",
      value: `${stats?.goalProgress || 0}%`,
      subtitle: "Concluída",
      icon: "fa-trophy",
      color: "chart-4",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-12 bg-muted rounded mb-4"></div>
              <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <Card key={index} className="hover-lift transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-${stat.color}/10 rounded-lg flex items-center justify-center`}>
                <i className={`fas ${stat.icon} text-${stat.color} text-xl`}></i>
              </div>
              <span className="text-sm text-muted-foreground">{stat.title}</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground" data-testid={`stat-${stat.title.toLowerCase()}`}>
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
