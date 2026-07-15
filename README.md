# Gestão e Validação Documental

MVP em React para controle de documentos, requisitos, revisões e planos de ação.

## Executar localmente

```bash
npm install
npm run dev
```

## Usar no Google AI Studio

1. Abra o modo **Build** e crie um aplicativo Web.
2. Solicite um app React/Vite ou importe este projeto pelo GitHub.
3. Substitua os arquivos gerados pelos arquivos deste pacote.
4. Execute o preview.

## Persistência

Esta versão usa `localStorage`, portanto os dados ficam no navegador do usuário. Para produção, peça ao agente do AI Studio:

> Conecte este aplicativo ao Firebase Firestore e adicione autenticação com Google. Mantenha as mesmas telas e regras. Migre documentos, requisitos, versões e ações para coleções Firestore, implemente controle de acesso por perfil e trilha de auditoria.

## Regras implementadas

- Cadastro e edição de documentos.
- Matriz de requisitos e resultados de validação.
- Comparação entre revisão do sistema e revisão disponível no processo.
- Histórico de versões.
- Nova revisão torna versões anteriores obsoletas e abre revalidação.
- Plano de ação com prioridade, prazo, responsável e status.
- Dashboard calculado automaticamente.
- Backup JSON, importação de backup e exportação CSV.
