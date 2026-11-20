
import { Component, inject,  ChangeDetectorRef  } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize, timeout } from 'rxjs';


@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.css'
})
export class CadastroComponent {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private API_URL = 'http://localhost:3000/estudantes';

  mensagemSucesso: string = '';
  mensagemErro: string = '';
  enviando: boolean = false;

  formEstudante = {
    nome: '',
    matricula: '',
    turma: '',
    turno: 'Matutino',
    email: '',
    senha: ''
  };


cadastrar() {
  if (this.enviando) return;

  this.mensagemSucesso = '';
  this.mensagemErro = '';

  const dados = {
    ...this.formEstudante,
    nome: this.formEstudante.nome.trim(),
    matricula: this.formEstudante.matricula.trim(),
    turma: this.formEstudante.turma.trim(),
    email: this.formEstudante.email.trim().toLowerCase()
  };

  if (
    !dados.nome ||
    !dados.matricula ||
    !dados.turma ||
    !dados.turno ||
    !dados.email ||
    !dados.senha
  ) {
    this.mensagemErro = 'Preencha todos os campos.';
    return;
  }

  if (dados.senha.length < 8) {
    this.mensagemErro = 'A senha precisa ter pelo menos 8 caracteres.';
    return;
  }

  this.enviando = true;

  this.http.post(this.API_URL, dados).pipe(
    timeout({ first: 15000 }),
    finalize(() => {
  this.enviando = false;
  this.cdr.detectChanges();

  console.log('Botão liberado:', this.enviando);
})
  ).subscribe({
    next: (resposta: any) => {
      console.log('Resposta da API:', resposta);

      this.mensagemSucesso = 'Cadastro concluído com sucesso!';
      this.limparFormulario();
    },
    error: (err) => {
      console.error('Erro ao cadastrar:', err);

      if (err.name === 'TimeoutError') {
        this.mensagemErro =
          'A API demorou para responder. Verifique o servidor.';
      } else {
        this.mensagemErro =
          err.error?.erro || 'Erro ao realizar o cadastro. Tente novamente.';
      }
    }
  });
}


  limparFormulario() {
    this.formEstudante = {
      nome: '',
      matricula: '',
      turma: '',
      turno: 'Matutino',
      email: '',
      senha: ''
    };
  }
}
