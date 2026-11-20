
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface Estudante {
  id?: number;
  nome: string;
  matricula: string;
  turma: string;
  turno: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private API_URL = 'http://localhost:3000/estudantes';

  estudantes: Estudante[] = [];
  estudanteEmEdicao: Estudante | null = null;

  ngOnInit() {
    this.carregarEstudantes();
  }

  // READ: carregar estudantes
  carregarEstudantes() {
  this.http.get<Estudante[]>(this.API_URL).subscribe({
    next: (dados) => {
      console.log('Estudantes recebidos:', dados);

      this.estudantes = dados;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Erro ao buscar estudantes:', err);
    }
  });
}

  // UPDATE: selecionar estudante para edição
  prepararEdicao(estudante: Estudante) {
    this.estudanteEmEdicao = { ...estudante };
  }

  // UPDATE: salvar alterações
  salvarEdicao() {
    if (!this.estudanteEmEdicao?.id) return;

    this.http.put(
      `${this.API_URL}/${this.estudanteEmEdicao.id}`,
      {
        turma: this.estudanteEmEdicao.turma,
        turno: this.estudanteEmEdicao.turno
      }
    ).subscribe({
      next: () => {
        alert('Dados atualizados com sucesso!');
        this.estudanteEmEdicao = null;
        this.carregarEstudantes();
      },
      error: (err) => console.error('Erro ao atualizar:', err)
    });
  }

  // DELETE: excluir estudante
  excluirEstudante(id?: number) {
    if (!id) return;

    if (confirm('Deseja realmente remover este estudante?')) {
      this.http.delete(`${this.API_URL}/${id}`).subscribe({
        next: () => {
          alert('Estudante excluído!');
          this.carregarEstudantes();
        },
        error: (err) => console.error('Erro ao excluir:', err)
      });
    }
  }
}
