package eticaret.demo.contact_us;

import eticaret.demo.response.ResponseMessage;

public interface ContactUsServis {
    ResponseMessage gonder(ContactUsMessage message);
    ResponseMessage verifyEmail(String verificationData);
    ResponseMessage getAllMessages();
    ResponseMessage respondToMessage(Long messageId, String response);
}