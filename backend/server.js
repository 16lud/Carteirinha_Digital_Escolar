const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./database');
const bcrypt = require('bcryptjs');

const app = express();
app.use(jwt({ secret: process.env.JWT_SECRET }));

app.use(cors());
app.use(express.json());

// Rota inicial da API
app.get('/', (req, res) => {
  res.json({ mensagem: 'API do Sistema de Carteirinha funcionando com sucesso!' });
});

// ---------------------------------------------------------
// ROTAS DA API PARA O CRUD DE ESTUDANTE
// ---------------------------------------------------------

// 1. READ: Listar todos os estudantes (com alias 'nome' para casar com o Angular)
app.get('/estudantes', (req, res) => {
  const sql = `
    SELECT 
      e.id,
      u.nome AS nome,
      u.email,
      e.matricula,
      e.turma,
      e.turno,
      es.nome AS escola
    FROM estudante e
    INNER JOIN usuario u ON e.usuario_id = u.id
    INNER JOIN escola es ON e.escola_id = es.id;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(' ERRO NO GET /estudantes:', err);
      return res.status(500).json({ erro: 'Erro ao consultar estudantes no banco', detalhes: err });
    }
    res.json(results);
  });
});

// 2. CREATE: Cadastrar um novo estudante (Criando o usuário dinamicamente)
// 2. CREATE: Cadastrar estudante e usuário
app.post('/estudantes', (req, res) => {
  console.log('REQUISIÇÃO DE CADASTRO RECEBIDA!');
  console.log('Dados recebidos:', req.body);
  const { nome, email, senha, matricula, turma, turno } = req.body;

  // Validar os campos
  if (!nome || !email || !senha || !matricula || !turma || !turno) {
    return res.status(400).json({
      erro: 'Preencha todos os campos.'
    });
  }

  const dados = {
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    matricula: matricula.trim(),
    turma: turma.trim(),
    turno: turno.trim()
  };

  if (dados.nome.length > 100 ||
      dados.email.length > 100 ||
      dados.turma.length > 10 ||
      dados.matricula.length > 200) {
    return res.status(400).json({
      erro: 'Um ou mais campos ultrapassaram o limite permitido.'
    });
  }

  if (senha.length < 8) {
    return res.status(400).json({
      erro: 'A senha precisa ter pelo menos 8 caracteres.'
    });
  }

  // Verificar se o e-mail já está cadastrado
  db.query(
    'SELECT id FROM usuario WHERE email = ?',
    [dados.email],
    (err, resultados) => {
      if (err) {
        console.error('Erro ao verificar e-mail:', err);
        return res.status(500).json({
          erro: 'Erro ao verificar cadastro.'
        });
        console.log('VERIFICAÇÃO DO E-MAIL CONCLUÍDA');
      }

      if (resultados.length > 0) {
        return res.status(409).json({
          erro: 'Este e-mail já está cadastrado.'
        });
      }

      // Proteger a senha
      bcrypt.hash(senha, 10, (errHash, senhaHash) => {
        if (errHash) {
          console.log('TRANSAÇÃO INICIADA');
          console.error('Erro ao proteger senha:', errHash);
          return res.status(500).json({
            erro: 'Erro ao processar senha.'
          });
        }

        // Iniciar transação
        db.beginTransaction((errTransacao) => {
          if (errTransacao) {
            return res.status(500).json({
              erro: 'Não foi possível iniciar o cadastro.'
            }); console.log('CADASTRO CONCLUÍDO!');
          }

          const sqlUsuario = `
            INSERT INTO usuario
            (nome, email, senha_hash, tipo_perfil, status)
            VALUES (?, ?, ?, ?, ?)
          `;

          db.query(
            sqlUsuario,
            [
              dados.nome,
              dados.email,
              senhaHash,
              'estudante',
              'ativo'
            ],
            (errUsuario, resultadoUsuario) => {
              if (errUsuario) {
                return db.rollback(() => {
                  console.error('Erro ao cadastrar usuário:', errUsuario);
                  res.status(500).json({
                    erro: 'Erro ao cadastrar usuário.'
                  });
                });
              }

              const sqlEstudante = `
                INSERT INTO estudante
                (usuario_id, matricula, escola_id, turma, turno)
                VALUES (?, ?, ?, ?, ?)
              `;

              db.query(
                sqlEstudante,
                [
                  resultadoUsuario.insertId,
                  dados.matricula,
                  1,
                  dados.turma,
                  dados.turno
                ],
                (errEstudante, resultadoEstudante) => {
                  if (errEstudante) {
                    return db.rollback(() => {
                      console.error('Erro ao cadastrar estudante:', errEstudante);
                      res.status(500).json({
                        erro: 'Erro ao cadastrar estudante.'
                      });
                    });
                  }

                  db.commit((errCommit) => {
                    if (errCommit) {
                      return db.rollback(() => {
                        console.error('Erro ao finalizar cadastro:', errCommit);
                        res.status(500).json({
                          erro: 'Erro ao finalizar cadastro.'
                        });
                      });
                    }

                    res.status(201).json({
                      mensagem: 'Cadastro realizado com sucesso!',
                      id: resultadoEstudante.insertId
                    });
                  });
                }
              );
            }
          );
        });
      });
    }
  );
});


// 3. UPDATE: Atualizar turma e turno do estudante
app.put('/estudantes/:id', (req, res) => {
  const { id } = req.params;
  const { turma, turno } = req.body;

  const sql = `
    UPDATE estudante
    SET turma = ?, turno = ?
    WHERE id = ?
  `;

  db.query(sql, [turma, turno, id], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar estudante:', err);
      return res.status(500).json({
        erro: 'Erro ao atualizar estudante'
      });
    }

    if (result.affectedRows === 0) {
      return db.query(
        'SELECT id FROM estudante WHERE id = ?',
        [id],
        (errCheck, rows) => {
          if (errCheck) {
            return res.status(500).json({
              erro: 'Erro ao verificar estudante'
            });
          }

          if (rows.length === 0) {
            return res.status(404).json({
              mensagem: 'Estudante não encontrado'
            });
          }

          return res.json({
            mensagem: 'Nenhuma alteração necessária.'
          });
        }
      );
    }

    res.json({
      mensagem: 'Estudante atualizado com sucesso!'
    });
  });
});


// 4. DELETE: Excluir um estudante pelo ID
app.delete('/estudantes/:id', (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM estudante WHERE id = ?;`;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error(' ERRO NO DELETE /estudantes:', err);
      return res.status(500).json({ erro: 'Erro ao deletar estudante', detalhes: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Estudante não encontrado' });
    }
    res.json({ mensagem: 'Estudante removido com sucesso!' });
  });
});
const PORT = 3000;
app.listen(PORT, () => {
  console.log('BACKEND CORRETO - VERSÃO DE TESTE');
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});