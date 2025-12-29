import os
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from datetime import datetime

class PDFService:
    def __init__(self):
        # Initialiser l'environnement Jinja2
        template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates', 'pdf')
        self.jinja_env = Environment(loader=FileSystemLoader(template_dir))

    def generate_purchase_order_pdf(self, order_data: dict) -> bytes:
        """
        Génère un PDF pour un bon de commande à partir d'un dictionnaire de données.
        """
        template = self.jinja_env.get_template('purchase_order.html')
        
        # Préparer les données pour le template
        context = {
            'order_number': order_data['orderNumber'],
            'date': order_data['createdAt'].strftime('%d/%m/%Y') if isinstance(order_data['createdAt'], datetime) else order_data['createdAt'],
            'status': order_data['status'],
            'supplier_name': order_data.get('supplierName'),
            'total_amount': order_data['totalAmount'],
            'items': order_data['items'],
            'requester_name': order_data['requestedBy']['name'],
            'approved_by_name': order_data.get('approvedBy', {}).get('name') if order_data.get('approvedBy') else None,
        }
        
        html_content = template.render(context)
        
        # Générer le PDF avec WeasyPrint
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        return pdf_bytes

    def generate_delivery_note_pdf(self, request_data: dict) -> bytes:
        """
        Génère un PDF pour un bon de livraison à partir d'un dictionnaire de données de requête.
        """
        template = self.jinja_env.get_template('delivery_note.html')
        
        # Préparer les données pour le template
        context = {
            'request_number': request_data['requestNumber'],
            'created_at': request_data['createdAt'].strftime('%d/%m/%Y') if isinstance(request_data['createdAt'], datetime) else request_data['createdAt'],
            'delivered_at': request_data.get('receivedAt', datetime.now()).strftime('%d/%m/%Y') if isinstance(request_data.get('receivedAt'), datetime) else request_data.get('receivedAt', 'N/A'),
            'requester_name': request_data['requester']['name'],
            'requester_department': request_data['requester'].get('department'),
            'deliverer_name': request_data.get('receivedBy', {}).get('name') if request_data.get('receivedBy') else 'Magasinier',
            'observations': request_data.get('requesterObservations'),
            'items': request_data['items'],
        }
        
        html_content = template.render(context)
        
        # Générer le PDF avec WeasyPrint
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        return pdf_bytes
