import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Key, User, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function SettingsPage() {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedRefresh, setCopiedRefresh] = useState(false);
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const token = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  const copyToClipboard = (text: string, type: "access" | "refresh") => {
    navigator.clipboard.writeText(text);
    
    if (type === "access") {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedRefresh(true);
      setTimeout(() => setCopiedRefresh(false), 2000);
    }

    toast({
      title: "Token copiado!",
      description: type === "access" 
        ? "Access Token copiado para a área de transferência" 
        : "Refresh Token copiado para a área de transferência",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas informações e tokens de integração
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações da Conta
          </CardTitle>
          <CardDescription>
            Dados do seu usuário no NuPIdentity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="text-lg font-semibold">{(user as any)?.name || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <p className="text-lg font-semibold">{(user as any)?.email || "-"}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">User ID</label>
            <p className="text-sm font-mono bg-muted px-3 py-2 rounded-xl mt-1">
              {(user as any)?.id || "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Tokens de Autenticação
          </CardTitle>
          <CardDescription>
            Use estes tokens para integrar sistemas externos com o NuPIdentity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  Access Token (JWT)
                  <Badge variant="outline" className="font-mono text-xs">
                    IDENTITY_ADMIN_TOKEN
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Use este token para autenticar requisições à API do NuPIdentity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted px-4 py-3 rounded-xl border border-border">
                <code className="text-xs font-mono break-all">
                  {token || "Nenhum token encontrado"}
                </code>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => token && copyToClipboard(token, "access")}
                disabled={!token}
                className="shrink-0"
              >
                {copiedToken ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="bg-accent/50 border border-accent rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-sm">💡 Como usar nos sistemas externos:</h4>
              <pre className="text-xs bg-background/80 p-3 rounded-lg overflow-x-auto">
{`# .env do seu sistema (NuP-Kan, NuP-CRM, etc)
IDENTITY_URL=http://localhost:5000
IDENTITY_ADMIN_TOKEN=${token?.substring(0, 30)}...
SYSTEM_ID=seu-sistema-id`}
              </pre>
            </div>
          </div>

          {refreshToken && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Refresh Token</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Token para renovar automaticamente o Access Token
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted px-4 py-3 rounded-xl border border-border">
                  <code className="text-xs font-mono break-all">
                    {refreshToken}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(refreshToken, "refresh")}
                  className="shrink-0"
                >
                  {copiedRefresh ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-yellow-700 dark:text-yellow-400 mb-2">
              ⚠️ Segurança
            </h4>
            <p className="text-sm text-yellow-600 dark:text-yellow-300">
              Mantenha seus tokens em segredo! Não compartilhe em repositórios públicos ou
              canais inseguros. Use sempre variáveis de ambiente (.env) nos seus sistemas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
