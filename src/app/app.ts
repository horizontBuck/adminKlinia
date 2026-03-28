import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { ScriptLoader } from './services/script-loader';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,
    Header,
    Footer
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('adminKlinia');
    constructor(public scriptLoader: ScriptLoader)
    {}
  async ngAfterViewInit(): Promise<void> {
  /*   try {
      await this.scriptLoader.loadAll([
        { src: 'assets/js/jquery.js', attr: { defer: 'true' } },
        { src: 'assets/js/popper.min.js', attr: { defer: 'true' } },
        { src: 'assets/js/bootstrap.min.js', attr: { defer: 'true' } },
        { src: 'assets/js/owl.js', attr: { defer: 'true' } },
        { src: 'assets/js/wow.js', attr: { defer: 'true' } },
        { src: 'assets/js/validation.js', attr: { defer: 'true' } },
        { src: 'assets/js/jquery.fancybox.js', attr: { defer: 'true' } },
        { src: 'assets/js/appear.js', attr: { defer: 'true' } },
        { src: 'assets/js/scrollbar.js', attr: { defer: 'true' } },
        { src: 'assets/js/tilt.jquery.js', attr: { defer: 'true' } },
        { src: 'assets/js/jquery.paroller.min.js', attr: { defer: 'true' } },
        { src: 'assets/js/jquery.nice-select.min.js', attr: { defer: 'true' } },
        { src: 'assets/js/product-filter.js', attr: { defer: 'true' } },
        { src: 'assets/js/script.js', attr: { defer: 'true' } },
 
      ]);
    } catch (err) {
      console.error('Error cargando scripts en Home', err);
    } */
  }
}

