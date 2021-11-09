export class EmbedData {
    content: string;
    title?: string;
    image?: string;
    footer?: string;

    constructor(content: string, title?: string, image?: string, footer?: string) {
        this.content = content;
        this.title = title;
        this.image = image;
        this.footer = footer;
    }
}
